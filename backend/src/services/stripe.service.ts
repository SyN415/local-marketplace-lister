import Stripe from 'stripe';
import { supabaseAdmin as supabase } from '../config/supabase';
import { config } from '../config/config';

const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover' as any, // Cast to any to avoid type issues if types are outdated
});

export const createCustomer = async (email: string, userId: string) => {
  try {
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId,
      },
    });

    // Update user profile with Stripe Customer ID
    const { error } = await supabase
      .from('profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile with Stripe Customer ID:', error);
      throw error;
    }

    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
};

export const createCheckoutSession = async (userId: string, priceId: string) => {
  try {
    // Get user profile to check for existing customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      const customer = await createCustomer(profile.email, userId);
      customerId = customer.id;
    }

    // Map priceId to credit amount (in a real app, this should be in a database or config)
    let credits = 0;
    if (priceId === 'price_10_credits') credits = 10;
    else if (priceId === 'price_25_credits') credits = 25;
    else if (priceId === 'price_50_credits') credits = 50;
    // Fallback or dynamic logic if needed

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment', // Changed from 'subscription' to 'payment' for one-time purchase
      success_url: `${config.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.FRONTEND_URL}/payment/cancel`,
      metadata: {
        userId,
        credits: credits.toString(), // Store credits in metadata to add in webhook
      },
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

export const handleWebhook = async (signature: string, payload: Buffer) => {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      config.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      // case 'customer.subscription.updated':
      //   const subscription = event.data.object as Stripe.Subscription;
      //   await handleSubscriptionUpdated(subscription);
      //   break;
      // case 'customer.subscription.deleted':
      //   const deletedSubscription = event.data.object as Stripe.Subscription;
      //   await handleSubscriptionDeleted(deletedSubscription);
      //   break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return { received: true };
  } catch (error: any) {
    console.error('Webhook error:', error.message);
    throw new Error(`Webhook Error: ${error.message}`);
  }
};

const handleCheckoutSessionCompleted = async (session: Stripe.Checkout.Session) => {
  const userId = session.metadata?.userId;
  const creditsToAdd = parseInt(session.metadata?.credits || '0', 10);
  const customerId = session.customer as string;

  if (userId && creditsToAdd > 0) {
    // Fetch current credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
    
    const currentCredits = profile?.credits || 0;

    // Update profile with new credit balance
    await supabase
      .from('profiles')
      .update({
        stripe_customer_id: customerId,
        credits: currentCredits + creditsToAdd,
      })
      .eq('id', userId);
  } else if (userId) {
     // Just update the stripe customer id if no credits (e.g. first time setup without purchase?)
     // or if we missed the metadata for some reason.
     await supabase
      .from('profiles')
      .update({
        stripe_customer_id: customerId,
      })
      .eq('id', userId);
  }
};

const handleInvoicePaymentSucceeded = async (invoice: Stripe.Invoice) => {
  const customerId = invoice.customer as string;
  // You might want to update subscription end date here if needed
  // But usually subscription updated event handles status changes
};

// const handleSubscriptionUpdated = async (subscription: Stripe.Subscription) => {
//   // Logic removed for credit-based system
// };

// const handleSubscriptionDeleted = async (subscription: Stripe.Subscription) => {
//   // Logic removed for credit-based system
// };