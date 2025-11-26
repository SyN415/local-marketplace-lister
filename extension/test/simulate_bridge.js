/**
 * SIMULATION SCRIPT
 * 
 * This script simulates the behavior of the React Frontend sending a message 
 * to the `bridge.js` content script.
 * 
 * INSTRUCTIONS:
 * 1. Open the Chrome Extension in a browser (or any page where the extension is active and allowed).
 * 2. Open the Developer Tools Console.
 * 3. Paste the contents of this file into the console.
 * 
 * EXPECTED BEHAVIOR:
 * - You should see "Bridge received command" in the console (logged by bridge.js).
 * - The extension popup/badge might update.
 * - If you have the background service worker inspector open, you should see "Queueing listing from bridge".
 * - Eventually, you should see "Extension response received" in this console.
 */

(function simulatePostListing() {
    console.log("🚀 Starting Bridge Simulation...");

    // 1. Define sample listing data
    const sampleListing = {
        jobId: `test_job_${Date.now()}`,
        platform: 'facebook',
        data: {
            title: "Test Item - Vintage Camera",
            price: 150,
            description: "A beautiful vintage camera in great condition. Works perfectly.",
            condition: "used_good",
            category: "electronics",
            images: [
                "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
                "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
            ],
            location: "San Francisco, CA"
        }
    };

    // 2. Define the message payload
    const message = {
        type: 'EXTENSION_COMMAND',
        command: 'POST_LISTING',
        payload: sampleListing
    };

    // 3. Listen for the response from the bridge
    const responseHandler = (event) => {
        if (event.data.type === 'EXTENSION_RESPONSE' && event.data.command === 'POST_LISTING') {
            console.log("✅ Extension response received:", event.data);
            console.log("🎉 Test Passed: Bridge successfully relayed message to Background and back.");
            window.removeEventListener('message', responseHandler);
        }
    };
    window.addEventListener('message', responseHandler);

    // 4. Send the message
    console.log("📤 Sending POST_LISTING command via window.postMessage...", message);
    window.postMessage(message, '*');

})();