/**
 * Type declarations for reservation controller
 * This helps TypeScript understand the module structure
 */

import { Request, Response, NextFunction } from 'express';

export function getAllReservations(req: Request, res: Response, next: NextFunction): Promise<void>;
export function getReservationById(req: Request, res: Response, next: NextFunction): Promise<void>;
export function createReservation(req: Request, res: Response, next: NextFunction): Promise<void>;
export function updateReservation(req: Request, res: Response, next: NextFunction): Promise<void>;
export function deleteReservation(req: Request, res: Response, next: NextFunction): Promise<void>;
export function getCustomerReservations(req: Request, res: Response, next: NextFunction): Promise<void>;
