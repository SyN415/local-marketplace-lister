import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Info, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { useAuth } from '@/hooks/useAuth';
import type { CreateConnectionData } from '@/types/index';

const formSchema = z.object({
  contactEmail: z.string().email({ message: "Invalid email address" }),
  contactPhone: z.string().optional().refine((val) => {
    if (!val) return true;
    // Basic US phone regex: allows (123) 456-7890, 123-456-7890, 1234567890
    return /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(val);
  }, { message: "Invalid phone number format (e.g. 123-456-7890)" }),
  showPhoneOnListings: z.boolean(),
  enabled: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface CraigslistFormProps {
  onSubmit: (data: CreateConnectionData) => void;
  isLoading?: boolean;
  error?: string | null;
}

const CraigslistForm: React.FC<CraigslistFormProps> = ({ onSubmit, isLoading, error }) => {
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contactEmail: user?.email || '',
      contactPhone: '',
      showPhoneOnListings: false,
      enabled: true,
    },
  });

  // Pre-fill email when user data becomes available
  useEffect(() => {
    if (user?.email) {
      // Only set if field is empty to avoid overwriting user input, unless it's the default empty string
      const currentEmail = watch('contactEmail');
      if (!currentEmail) {
        setValue('contactEmail', user.email, { shouldValidate: true });
      }
    }
  }, [user, setValue, watch]);

  const onFormSubmit = (data: FormValues) => {
    onSubmit({
      platform: 'craigslist',
      credentials: {
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        showPhoneOnListings: data.showPhoneOnListings,
        enabled: data.enabled,
      },
    });
  };

  return (
    <Card className="w-full border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Craigslist Connection</CardTitle>
        <CardDescription>
          Set up your Craigslist listing details. We'll create a secure proxy email 
          to protect your privacy while forwarding legitimate buyer inquiries to you.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Email Section */}
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email (required)</Label>
            <Input 
              id="contactEmail" 
              type="email" 
              placeholder="your@email.com"
              {...register('contactEmail')} 
            />
            {errors.contactEmail && (
              <p className="text-sm font-medium text-destructive">{errors.contactEmail.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Replies to your listings will be forwarded to this email.
            </p>
          </div>
          
          {/* Phone Section */}
          <div className="space-y-2">
            <Label htmlFor="contactPhone">Phone Number (optional)</Label>
            <Input 
              id="contactPhone" 
              type="tel" 
              placeholder="123-456-7890"
              {...register('contactPhone')} 
            />
            {errors.contactPhone && (
              <p className="text-sm font-medium text-destructive">{errors.contactPhone.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="showPhoneOnListings" 
              checked={watch('showPhoneOnListings')}
              onCheckedChange={(checked) => setValue('showPhoneOnListings', checked as boolean)}
            />
            <Label htmlFor="showPhoneOnListings" className="font-normal cursor-pointer">
              Show phone number on listings
            </Label>
          </div>
          
          {/* Proxy Email Info (Placeholder) */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Proxy Email</AlertTitle>
            <AlertDescription>
              A secure proxy email will be assigned to you after connection.
            </AlertDescription>
          </Alert>
          
          {/* Submit */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Connection'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CraigslistForm;