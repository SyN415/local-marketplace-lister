import { Router, Request, Response } from 'express';

const router = Router();

// Placeholder listing routes
router.get('/', (req: Request, res: Response) => {
  res.status(501).json({
    status: 'error',
    message: 'Listing routes not yet implemented',
  });
});

router.post('/', (req: Request, res: Response) => {
  res.status(501).json({
    status: 'error',
    message: 'Listing routes not yet implemented',
  });
});

router.put('/:id', (req: Request, res: Response) => {
  res.status(501).json({
    status: 'error',
    message: 'Listing routes not yet implemented',
  });
});

router.delete('/:id', (req: Request, res: Response) => {
  res.status(501).json({
    status: 'error',
    message: 'Listing routes not yet implemented',
  });
});

export const listingRoutes = router;