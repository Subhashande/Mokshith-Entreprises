import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './support.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const createTicket = asyncHandler(async (req, res) => {
  const ticket = await service.createTicket(req.user.id, req.body);
  successResponse(res, ticket, 'Support ticket created successfully', 201);
});

export const getMyTickets = asyncHandler(async (req, res) => {
  const tickets = await service.getMyTickets(req.user.id);
  successResponse(res, tickets);
});

export const getAllTickets = asyncHandler(async (req, res) => {
  const tickets = await service.getAllTickets();
  successResponse(res, tickets);
});

export const updateTicketStatus = asyncHandler(async (req, res) => {
  const ticket = await service.updateTicketStatus(req.params.id, req.body.status);
  successResponse(res, ticket, 'Ticket status updated');
});
