import express from 'express';
import { getMember, addPoints, redeemPoints, getMemberStats, getAllMembers } from '../controllers/loyalty.controller';

const router = express.Router();

router.get('/members', getAllMembers);
router.get('/member/:customerId', getMember);
router.post('/member/:customerId/points', addPoints);
router.post('/member/:customerId/redeem', redeemPoints);
router.get('/member/:customerId/stats', getMemberStats);

export default router;
