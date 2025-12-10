import { useState, useEffect } from 'react';
import {
  Card,
  Button, TextField, Switch, Chip,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableHead, TableRow,
  FormControlLabel, Checkbox, Slider, Alert
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import { scoutAPI } from '../services/api';

declare global {
  interface Window {
    chrome: any;
  }
}

interface WatchlistItem {
  id: string;
  keywords: string;
  platforms: string[];
  maxPrice?: number;
  minPrice?: number;
  location?: string;
  radiusMiles: number;
  isActive: boolean;
  notificationEnabled: boolean;
  checkIntervalMinutes: number;
  totalMatches: number;
  lastCheckedAt?: string;
  createdAt: string;
}

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState<WatchlistItem[]>([]);
  // const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<WatchlistItem | null>(null);
  const [formData, setFormData] = useState({
    keywords: '',
    platforms: ['facebook', 'craigslist'],
    maxPrice: '',
    minPrice: '',
    location: '',
    radiusMiles: 25,
    checkIntervalMinutes: 30,
    notificationEnabled: true
  });

  useEffect(() => {
    fetchWatchlists();
  }, []);

  const fetchWatchlists = async () => {
    try {
      const data = await scoutAPI.getWatchlists();
      setWatchlists(data);
      // Sync with extension
      if (typeof window.chrome !== 'undefined' && window.chrome.runtime) {
        window.chrome.runtime.sendMessage({
            action: 'SYNC_WATCHLIST',
            items: data
        });
      }
    } catch (err) {
      console.error('Failed to fetch watchlists:', err);
    } finally {
      // setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editItem) {
        await scoutAPI.updateWatchlist(editItem.id, formData);
      } else {
        await scoutAPI.createWatchlist(formData);
      }
      setDialogOpen(false);
      fetchWatchlists();
    } catch (err) {
      console.error('Failed to save watchlist:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this watchlist?')) return;
    try {
      await scoutAPI.deleteWatchlist(id);
      fetchWatchlists();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleToggleActive = async (item: WatchlistItem) => {
    try {
      await scoutAPI.updateWatchlist(item.id, { isActive: !item.isActive });
      fetchWatchlists();
    } catch (err) {
      console.error('Failed to toggle:', err);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">🔍 Smart Scout Watchlists</h1>
          <p className="text-gray-600">
            Monitor marketplaces for deals matching your keywords
          </p>
        </div>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => {
            setEditItem(null);
            setFormData({
              keywords: '',
              platforms: ['facebook', 'craigslist'],
              maxPrice: '',
              minPrice: '',
              location: '',
              radiusMiles: 25,
              checkIntervalMinutes: 30,
              notificationEnabled: true
            });
            setDialogOpen(true);
          }}
        >
          Add Watchlist
        </Button>
      </div>

      <Alert severity="info" className="mb-4">
        <strong>Tip:</strong> Keep the extension popup or a marketplace tab open for 
        watchlist monitoring to work. Checks run every 15-30 minutes.
      </Alert>

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Keywords</TableCell>
              <TableCell>Platforms</TableCell>
              <TableCell>Price Range</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Matches</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {watchlists.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="font-medium">{item.keywords}</div>
                  <div className="text-sm text-gray-500">
                    Every {item.checkIntervalMinutes} min
                  </div>
                </TableCell>
                <TableCell>
                  {item.platforms.map(p => (
                    <Chip key={p} label={p} size="small" className="mr-1" />
                  ))}
                </TableCell>
                <TableCell>
                  {item.minPrice || item.maxPrice ? (
                    <span>
                      ${item.minPrice || 0} - ${item.maxPrice || '∞'}
                    </span>
                  ) : (
                    <span className="text-gray-400">Any</span>
                  )}
                </TableCell>
                <TableCell>
                  <Switch 
                    checked={item.isActive}
                    onChange={() => handleToggleActive(item)}
                    color="primary"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={item.totalMatches} 
                    color={item.totalMatches > 0 ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => {
                    setEditItem(item);
                    setFormData({
                      keywords: item.keywords,
                      platforms: item.platforms,
                      maxPrice: item.maxPrice?.toString() || '',
                      minPrice: item.minPrice?.toString() || '',
                      location: item.location || '',
                      radiusMiles: item.radiusMiles,
                      checkIntervalMinutes: item.checkIntervalMinutes,
                      notificationEnabled: item.notificationEnabled
                    });
                    setDialogOpen(true);
                  }}>
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(item.id)} color="error">
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editItem ? 'Edit Watchlist' : 'New Watchlist'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Keywords"
            placeholder="e.g., Herman Miller Aeron, iPhone 15 Pro"
            fullWidth
            margin="normal"
            value={formData.keywords}
            onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
          />
          
          <div className="mt-4">
            <label className="text-sm font-medium">Platforms</label>
            <div className="flex gap-4 mt-2">
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={formData.platforms.includes('facebook')}
                    onChange={(e) => {
                      const platforms = e.target.checked 
                        ? [...formData.platforms, 'facebook']
                        : formData.platforms.filter(p => p !== 'facebook');
                      setFormData({ ...formData, platforms });
                    }}
                  />
                }
                label="Facebook Marketplace"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={formData.platforms.includes('craigslist')}
                    onChange={(e) => {
                      const platforms = e.target.checked 
                        ? [...formData.platforms, 'craigslist']
                        : formData.platforms.filter(p => p !== 'craigslist');
                      setFormData({ ...formData, platforms });
                    }}
                  />
                }
                label="Craigslist"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <TextField
              label="Min Price"
              type="number"
              value={formData.minPrice}
              onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
            />
            <TextField
              label="Max Price"
              type="number"
              value={formData.maxPrice}
              onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })}
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium">
              Check Interval: {formData.checkIntervalMinutes} minutes
            </label>
            <Slider
              value={formData.checkIntervalMinutes}
              onChange={(_, value) => setFormData({ ...formData, checkIntervalMinutes: value as number })}
              min={15}
              max={120}
              step={15}
              marks={[
                { value: 15, label: '15m' },
                { value: 30, label: '30m' },
                { value: 60, label: '1h' },
                { value: 120, label: '2h' }
              ]}
            />
          </div>

          <FormControlLabel
            control={
              <Switch
                checked={formData.notificationEnabled}
                onChange={(e) => setFormData({ ...formData, notificationEnabled: e.target.checked })}
              />
            }
            label="Enable browser notifications for new matches"
            className="mt-4"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!formData.keywords}>
            {editItem ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}