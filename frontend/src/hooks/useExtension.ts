import { useState, useEffect, useCallback } from 'react';
import type { ListingsListItem } from '../types/listings';

// Message types
interface ExtensionMessage {
  type: 'EXTENSION_LOADED' | 'EXTENSION_RESPONSE' | 'EXTENSION_EVENT';
  version?: string;
  command?: string;
  result?: any;
  event?: string;
  data?: any;
}

interface ExtensionCommand {
  type: 'EXTENSION_COMMAND';
  command: 'POST_LISTING' | 'CHECK_STATUS';
  payload?: any;
}

export interface UseExtensionResult {
  isInstalled: boolean;
  version: string | null;
  postListing: (listing: ListingsListItem, platform: string) => Promise<any>;
  lastResponse: any;
}

export const useExtension = (): UseExtensionResult => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<any>(null);

  // Check for extension on mount
  useEffect(() => {
    // Check if the extension has already injected the flag
    if (document.documentElement.dataset.extensionInstalled) {
      setIsInstalled(true);
    }

    // Listen for messages from the extension bridge
    const handleMessage = (event: MessageEvent) => {
      // Security check: Ensure message is from the same window
      if (event.source !== window) return;

      const message = event.data as ExtensionMessage;

      if (message.type === 'EXTENSION_LOADED') {
        setIsInstalled(true);
        if (message.version) {
          setVersion(message.version);
        }
      } else if (message.type === 'EXTENSION_RESPONSE') {
        console.log('Extension response:', message);
        setLastResponse(message);
      } else if (message.type === 'EXTENSION_EVENT') {
        console.log('Extension event:', message);
      }
    };

    window.addEventListener('message', handleMessage);

    // Ping the extension (in case it loaded before this hook)
    // We can do this by checking the DOM or waiting for the EXTENSION_LOADED event
    // The bridge script sets a data attribute on documentElement
    const checkInterval = setInterval(() => {
      if (document.documentElement.dataset.extensionInstalled) {
        setIsInstalled(true);
        clearInterval(checkInterval);
      }
    }, 1000);

    // Clean up
    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(checkInterval);
    };
  }, []);

  // Function to send listing to extension
  const postListing = useCallback(async (listing: ListingsListItem, platform: string) => {
    if (!isInstalled) {
      throw new Error('Extension is not installed');
    }

    // Transform listing data to match what the extension expects
    // This matches the structure in docs/client-side-extension-architecture.md
    const payload = {
      jobId: `job_${Date.now()}`, // Generate a temporary ID
      platform,
      data: {
        title: listing.title,
        price: listing.price,
        description: listing.description || '',
        condition: listing.condition,
        category: listing.category,
        images: listing.images || [],
        location: listing.location || 'San Francisco, CA' // Default fallback
      }
    };

    // Send message to the bridge
    const message: ExtensionCommand = {
      type: 'EXTENSION_COMMAND',
      command: 'POST_LISTING',
      payload
    };

    window.postMessage(message, '*');
    
    // We assume success if the message is sent. 
    // The actual success/failure will come back via 'EXTENSION_RESPONSE'
    return { status: 'queued', payload };
  }, [isInstalled]);

  return {
    isInstalled,
    version,
    postListing,
    lastResponse
  };
};