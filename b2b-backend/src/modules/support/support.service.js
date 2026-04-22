import Support from './support.model.js';
import AppError from '../../errors/AppError.js';

export const createTicket = async (userId, data) => {
  const { subject, message } = data;
  if (!subject || !message) {
    throw new AppError('Subject and message are required', 400);
  }

  const ticket = await Support.create({
    userId,
    subject,
    message,
  });

  return ticket;
};

export const getMyTickets = async (userId) => {
  return await Support.find({ userId }).sort({ createdAt: -1 });
};

export const getAllTickets = async () => {
  return await Support.find().populate('userId', 'name email').sort({ createdAt: -1 });
};

export const updateTicketStatus = async (ticketId, status) => {
  const ticket = await Support.findByIdAndUpdate(
    ticketId,
    { status },
    { new: true }
  );
  if (!ticket) throw new AppError('Ticket not found', 404);
  return ticket;
};
