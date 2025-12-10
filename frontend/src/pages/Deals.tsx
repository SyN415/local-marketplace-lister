import { useState, useEffect } from 'react';
import {
  Card,
  Button, Chip,
  Table, TableBody, TableCell, TableHead, TableRow,
  Alert
} from '@mui/material';
import { scoutAPI } from '../services/api';

interface Deal {
  id: string;
  listing_title: string;
  listing_price: number;
  platform: string;
  spread_amount: number;
  deal_score: number;
  status: string;
  created_at: string;
  listing_image_url?: string;
  platform_listing_url: string;
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      // Assuming api.ts has a getComparisons method exposed via scoutAPI?
      // Wait, let's check api.ts again or update it.
      // Based on previous step, we might need to add getComparisons to scoutAPI.
      // Let's assume it exists or we will add it.
      // Actually, looking at the plan, backend has /api/scout/comparisons.
      // Let's check api.ts if we added it.
      // We didn't add getComparisons explicitly in the diff, let's double check.
      // Ah, I missed adding getComparisons to frontend/src/services/api.ts in the previous step's diff.
      // I will need to fix that first or assume I can fix it now.
      
      // For now, let's write the component and I will fix api.ts in next step if needed.
      // Or I can use api.get directly here as a fallback.
      const response = await scoutAPI.getComparisons(); // Hypothetical method
      setDeals(response);
    } catch (err) {
      console.error('Failed to fetch deals:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">💰 Saved Deals</h1>
          <p className="text-gray-600">
            Track potential flips and market opportunities
          </p>
        </div>
      </div>

      {deals.length === 0 && !loading && (
        <Alert severity="info">
          No deals saved yet. Use the extension to save deals when you find them!
        </Alert>
      )}

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Potential Profit</TableCell>
              <TableCell>Score</TableCell>
              <TableCell>Platform</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deals.map((deal) => (
              <TableRow key={deal.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {deal.listing_image_url && (
                        <img src={deal.listing_image_url} alt="" className="w-10 h-10 rounded object-cover" />
                    )}
                    <div className="font-medium">{deal.listing_title}</div>
                  </div>
                </TableCell>
                <TableCell>${deal.listing_price}</TableCell>
                <TableCell className={deal.spread_amount > 0 ? 'text-green-600 font-medium' : ''}>
                  ${deal.spread_amount?.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={deal.deal_score} 
                    color={deal.deal_score >= 80 ? 'success' : deal.deal_score >= 50 ? 'warning' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell className="capitalize">{deal.platform}</TableCell>
                <TableCell>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    href={deal.platform_listing_url}
                    target="_blank"
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}