import { useState, useEffect } from 'react';
import {
  Card, CardContent, CardHeader,
  Button, Chip, TextField, Alert, CircularProgress,
  Table, TableBody, TableCell, TableHead, TableRow,
  Tabs, Tab, Box, Typography, Divider, IconButton, Tooltip
} from '@mui/material';
import { Refresh, Delete, OpenInNew, TrendingUp, Warning, CheckCircle } from '@mui/icons-material';
import { pcResaleAPI } from '../services/api';

interface Opportunity {
  id: string;
  listingTitle: string;
  listingPrice: number;
  platform: string;
  platformListingUrl: string;
  recommendation: 'BUY' | 'SKIP';
  netProfit: number;
  roiPercentage: number;
  status: string;
  createdAt: string;
}

interface AnalysisResult {
  recommendation: 'BUY' | 'SKIP';
  listingPrice: number;
  aggregateComponentValue: number;
  grossProfit: number;
  netProfit: number;
  roiPercentage: number;
  roiMultiplier: number;
  confidenceScore: number;
  reasoning: string;
  costBreakdown: {
    dismantling: number;
    shipping: number;
    ebayFees: number;
    packaging: number;
    total: number;
  };
  componentProfile: {
    rawComponents: Record<string, string[]>;
    estimatedTier: string;
    missingSpecs: string[];
  };
  componentValuation: {
    componentBreakdown: Record<string, number>;
    componentSearchUrls?: Record<string, string>;
    componentsPriced: number;
  };
}

export default function PcResaleScannerPage() {
  const [tab, setTab] = useState(0);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [listingUrl, setListingUrl] = useState('');

  // Read URL parameters to pre-fill form from extension
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTitle = params.get('title');
    const urlDescription = params.get('description');
    const urlPrice = params.get('price');
    const urlListingUrl = params.get('url');

    if (urlTitle) setTitle(decodeURIComponent(urlTitle));
    if (urlDescription) setDescription(decodeURIComponent(urlDescription));
    if (urlPrice) setPrice(urlPrice);
    if (urlListingUrl) setListingUrl(decodeURIComponent(urlListingUrl));

    // Clear URL params after reading to prevent re-fill on refresh
    if (urlTitle || urlPrice) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (tab === 1) {
      fetchOpportunities();
    }
  }, [tab]);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const data = await pcResaleAPI.getOpportunities();
      setOpportunities(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch opportunities');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!title || !price) {
      setError('Title and price are required');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await pcResaleAPI.analyzeListing({
        title,
        description,
        price: parseFloat(price),
        platformListingUrl: listingUrl,
        platform: listingUrl.includes('facebook') ? 'facebook' : 'craigslist',
      });
      setAnalysis(result);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze listing');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveOpportunity = async () => {
    if (!analysis) return;

    try {
      await pcResaleAPI.analyzeAndSave({
        title,
        description,
        price: parseFloat(price),
        platformListingUrl: listingUrl,
        platform: listingUrl.includes('facebook') ? 'facebook' : 'craigslist',
      });
      setTab(1);
      fetchOpportunities();
    } catch (err: any) {
      setError(err.message || 'Failed to save opportunity');
    }
  };

  const handleDeleteOpportunity = async (id: string) => {
    try {
      await pcResaleAPI.deleteOpportunity(id);
      setOpportunities(prev => prev.filter(o => o.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete opportunity');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">🖥️ PC Resale Scanner</h1>
          <p className="text-gray-600">
            Analyze PC builds for profitable part-out opportunities
          </p>
        </div>
      </div>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} className="mb-4">
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Analyze Listing" />
          <Tab label="Saved Opportunities" />
        </Tabs>
      </Box>

      {tab === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <Card>
            <CardHeader title="Listing Details" />
            <CardContent className="space-y-4">
              <TextField
                fullWidth label="Listing Title" value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Gaming PC RTX 4070 Ryzen 7 5800X 32GB RAM"
              />
              <TextField
                fullWidth label="Description" value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline rows={4}
                placeholder="Paste the full listing description here..."
              />
              <TextField
                fullWidth label="Price ($)" value={price} type="number"
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g., 800"
              />
              <TextField
                fullWidth label="Listing URL (optional)" value={listingUrl}
                onChange={(e) => setListingUrl(e.target.value)}
                placeholder="https://facebook.com/marketplace/..."
              />
              <Button
                variant="contained" fullWidth onClick={handleAnalyze}
                disabled={analyzing || !title || !price}
                startIcon={analyzing ? <CircularProgress size={20} /> : <TrendingUp />}
              >
                {analyzing ? 'Analyzing...' : 'Analyze for Profit'}
              </Button>
            </CardContent>
          </Card>

          {/* Analysis Results */}
          {analysis && (
            <Card>
              <CardHeader
                title={
                  <div className="flex items-center gap-2">
                    {analysis.recommendation === 'BUY' ? (
                      <CheckCircle color="success" />
                    ) : (
                      <Warning color="warning" />
                    )}
                    <span>Analysis Result: {analysis.recommendation}</span>
                  </div>
                }
                action={
                  analysis.recommendation === 'BUY' && (
                    <Button variant="outlined" onClick={handleSaveOpportunity}>
                      Save Opportunity
                    </Button>
                  )
                }
              />
              <CardContent>
                {/* ROI Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <Typography variant="caption" color="textSecondary">Listing Price</Typography>
                    <Typography variant="h6">${analysis.listingPrice}</Typography>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <Typography variant="caption" color="textSecondary">Parts Value</Typography>
                    <Typography variant="h6" color="primary">${analysis.aggregateComponentValue}</Typography>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <Typography variant="caption" color="textSecondary">Net Profit</Typography>
                    <Typography variant="h6" color={analysis.netProfit > 0 ? 'success.main' : 'error.main'}>
                      ${analysis.netProfit.toFixed(2)}
                    </Typography>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <Typography variant="caption" color="textSecondary">ROI</Typography>
                    <Typography variant="h6">{analysis.roiPercentage}%</Typography>
                  </div>
                </div>

                <Divider className="my-4" />

                {/* Component Breakdown */}
                <Typography variant="subtitle2" className="mb-2">Detected Components</Typography>
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(analysis.componentProfile.rawComponents).map(([type, values]) => (
                    values.map((v, i) => (
                      <Chip key={`${type}-${i}`} label={`${type}: ${v}`} size="small" variant="outlined" />
                    ))
                  ))}
                </div>

                {analysis.componentProfile.missingSpecs.length > 0 && (
                  <Alert severity="warning" className="mb-4">
                    Missing specs: {analysis.componentProfile.missingSpecs.join(', ')}
                  </Alert>
                )}

                {/* Component Valuations - Individual part prices */}
                {analysis.componentValuation?.componentBreakdown &&
                 Object.keys(analysis.componentValuation.componentBreakdown).length > 0 && (
                  <>
                    <Typography variant="subtitle2" className="mb-2">Component Valuations (eBay)</Typography>
                    <Table size="small" className="mb-4">
                      <TableBody>
                        {Object.entries(analysis.componentValuation.componentBreakdown).map(([component, value]) => {
                          const searchUrl = analysis.componentValuation.componentSearchUrls?.[component];
                          return (
                            <TableRow key={component}>
                              <TableCell sx={{ textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 1 }}>
                                {component}
                                {searchUrl && (
                                  <Tooltip title="View eBay sold listings">
                                    <IconButton
                                      size="small"
                                      href={searchUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      sx={{ padding: '2px' }}
                                    >
                                      <OpenInNew fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </TableCell>
                              <TableCell align="right" sx={{ color: value > 0 ? 'success.main' : 'text.secondary' }}>
                                {value > 0 ? `$${value.toFixed(2)}` : 'No data'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow>
                          <TableCell><strong>Total Parts Value</strong></TableCell>
                          <TableCell align="right" sx={{ color: 'primary.main' }}>
                            <strong>${analysis.aggregateComponentValue.toFixed(2)}</strong>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </>
                )}

                {/* Cost Breakdown */}
                <Typography variant="subtitle2" className="mb-2">Cost Breakdown</Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Dismantling Labor</TableCell>
                      <TableCell align="right">${analysis.costBreakdown.dismantling}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Shipping (est.)</TableCell>
                      <TableCell align="right">${analysis.costBreakdown.shipping.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>eBay Fees (13%)</TableCell>
                      <TableCell align="right">${analysis.costBreakdown.ebayFees.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Packaging</TableCell>
                      <TableCell align="right">${analysis.costBreakdown.packaging}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Total Costs</strong></TableCell>
                      <TableCell align="right"><strong>${analysis.costBreakdown.total.toFixed(2)}</strong></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <Divider className="my-4" />
                <Typography variant="body2" color="textSecondary">
                  <strong>Reasoning:</strong> {analysis.reasoning}
                </Typography>
                <Typography variant="caption" color="textSecondary" className="mt-2 block">
                  Confidence: {(analysis.confidenceScore * 100).toFixed(0)}% | Tier: {analysis.componentProfile.estimatedTier}
                </Typography>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === 1 && (
        <Card>
          <CardHeader
            title="Saved Opportunities"
            action={
              <IconButton onClick={fetchOpportunities} disabled={loading}>
                <Refresh />
              </IconButton>
            }
          />
          {loading ? (
            <div className="flex justify-center p-8">
              <CircularProgress />
            </div>
          ) : opportunities.length === 0 ? (
            <Alert severity="info" className="m-4">
              No opportunities saved yet. Analyze a listing and save it!
            </Alert>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Listing</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Net Profit</TableCell>
                  <TableCell>ROI</TableCell>
                  <TableCell>Recommendation</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {opportunities.map((opp) => (
                  <TableRow key={opp.id}>
                    <TableCell>
                      <div className="max-w-xs truncate">{opp.listingTitle}</div>
                    </TableCell>
                    <TableCell>${opp.listingPrice}</TableCell>
                    <TableCell className={opp.netProfit > 0 ? 'text-green-600 font-medium' : 'text-red-600'}>
                      ${opp.netProfit.toFixed(2)}
                    </TableCell>
                    <TableCell>{opp.roiPercentage}%</TableCell>
                    <TableCell>
                      <Chip
                        label={opp.recommendation}
                        color={opp.recommendation === 'BUY' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {opp.platformListingUrl && (
                          <Tooltip title="View Listing">
                            <IconButton size="small" href={opp.platformListingUrl} target="_blank">
                              <OpenInNew fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDeleteOpportunity(opp.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}

