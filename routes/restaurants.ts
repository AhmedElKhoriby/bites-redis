import express from 'express';
import type { Request } from 'express';
import { nanoid } from 'nanoid';
import { validate } from '../middlewares/validate.js';
import { RestaurantSchema, type Restaurant } from '../schemas/restaurant.js';
import { ReviewSchema, type Review } from '../schemas/review.js';
import { initializeRedisClient } from '../utils/client.js';
import {
  restaurantKeyById,
  reviewKeyById,
  reviewDetailesKeyById,
} from '../utils/keys.js';
import { checkRestaurantExists } from '../middlewares/checkRestaurantId.js';
import { successResponse, errorResponse } from '../utils/responses.js';
const router = express.Router();

router.post('/', validate(RestaurantSchema), async (req, res) => {
  const data = req.body as Restaurant;

  const client = await initializeRedisClient();
  const id = nanoid();
  const restaurantKey = restaurantKeyById(id);
  const hashData = { id, name: data.name, location: data.location };
  const addResult = await client.hSet(restaurantKey, hashData);

  console.log(`Added ${addResult} fields`);

  successResponse(res, hashData, 'Restaurant added successfully');
});

router.post(
  '/:restaurantId/reviews',
  checkRestaurantExists,
  validate(ReviewSchema),
  async (req: Request<{ restaurantId: string }>, res) => {
    const { restaurantId } = req.params;
    const data = req.body as Review;

    const client = await initializeRedisClient();
    const reviewId = nanoid();
    const reviewKey = reviewKeyById(restaurantId);
    const reviewDetailesKey = reviewDetailesKeyById(reviewId);
    const hashData = {
      id: reviewId,
      ...data,
      timestamp: new Intl.DateTimeFormat('default', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      }).format(new Date()),
      restaurantId,
    };

    await Promise.all([
      client.lPush(reviewKey, reviewId),
      client.hSet(reviewDetailesKey, hashData),
    ]);

    successResponse(res, hashData, 'Review added successfully');
  }
);

router.get(
  '/:restaurantId/reviews',
  checkRestaurantExists,
  async (req: Request<{ restaurantId: string }>, res) => {
    const { restaurantId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const start = (Number(page) - 1) * Number(limit);
    const end = start + Number(limit) - 1;

    const client = await initializeRedisClient();
    const reviewKey = reviewKeyById(restaurantId);
    const reviewIds = await client.lRange(reviewKey, start, end);
    const reviews = await Promise.all(
      reviewIds.map((id) => client.hGetAll(reviewDetailesKeyById(id)))
    );

    successResponse(res, reviews, 'Reviews fetched successfully');
  }
);

router.delete(
  '/:restaurantId/reviews/:reviewId',
  checkRestaurantExists,
  async (req: Request<{ restaurantId: string; reviewId: string }>, res) => {
    const { restaurantId, reviewId } = req.params;

    const client = await initializeRedisClient();
    const reviewKey = reviewKeyById(restaurantId);
    const reviewDetailesKey = reviewDetailesKeyById(reviewId);

    const [removeResult, deleteResult] = await Promise.all([
      client.lRem(reviewKey, 0, reviewId),
      client.del(reviewDetailesKey),
    ]);

    if (removeResult === 0 && deleteResult === 0) {
      errorResponse(res, 404, 'Review not found or already deleted');
      return;
    }

    successResponse(res, reviewId, 'Review deleted successfully');
  }
);

router.get(
  '/:restaurantId',
  checkRestaurantExists,
  async (req: Request<{ restaurantId: string }>, res) => {
    const { restaurantId } = req.params;

    const client = await initializeRedisClient();
    const restaurantKey = restaurantKeyById(restaurantId);

    // Increment the view count and get the restaurant data
    // Use Promise.all to run both commands in parallel
    // This is more efficient than waiting for each command to finish one by one and is a good practice when you have multiple independent commands
    const [viewCount, resturant] = await Promise.all([
      client.hIncrBy(restaurantKey, 'viewCount', 1),
      client.hGetAll(restaurantKey),
    ]);

    successResponse(res, resturant, 'Restaurant fetched successfully');
  }
);

export default router;
