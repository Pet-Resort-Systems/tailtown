import { Router } from 'express';
import {
  getAllPriceRules,
  getPriceRuleById,
  createPriceRule,
  updatePriceRule,
  deletePriceRule,
  calculatePrice
} from '../controllers/priceRule.controller';

const router = Router();

router.route('/')
  .get(getAllPriceRules)
  .post(createPriceRule);

router.route('/:id')
  .get(getPriceRuleById)
  .put(updatePriceRule)
  .delete(deletePriceRule);

router.post('/calculate', calculatePrice);

export default router;
