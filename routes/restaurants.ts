import express from 'express';
import type { Request } from 'express';
import { nanoid } from 'nanoid';
import { validate } from '../middlewares/validate.js';
import { RestaurantSchema, type Restaurant } from '../schemas/restaurant.js';
import { initializeRedisClient } from '../utils/client.js';
import { restaurantKeyById } from '../utils/keys.js';
import { checkRestaurantExists } from '../middlewares/checkRestaurantId.js';
import { successResponse } from '../utils/responses.js';
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
