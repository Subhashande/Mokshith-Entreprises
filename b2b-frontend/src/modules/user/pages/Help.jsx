import React, { useState, useEffect } from 'react';
import { supportService } from '../../support/services/supportService';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { HelpCircle, Send, MessageSquare, Clock, CheckCircle2, AlertCircle, Search } from 'lucide-react';

const Help = () => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const data = await supportService.getMyTickets();
      setTickets(data.data || data);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    try {
      await supportService.createTicket({ 
        subject: 'General Inquiry', // Added default subject as backend requires it
        message 
      });
      alert('Support ticket created successfully!');
      setMessage('');
      fetchTickets();
    } catch (err) {
      alert(err.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return <Clock size={14} className="text-blue-500" />;
      case 'in-progress': return <AlertCircle size={14} className="text-yellow-500" />;
      case 'resolved': return <CheckCircle2 size={14} className="text-green-500" />;
      default: return <Clock size={14} />;
    }
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'in-progress': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case 'resolved': return 'bg-green-50 text-green-700 border-green-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">How can we help?</h1>
        <p className="text-gray-500 text-lg">Our support team is here to assist you 24/7</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: New Ticket Form */}
        <div className="lg:col-span-1">
          <Card className="p-0 overflow-hidden shadow-xl border-none">
            <div className="bg-blue-600 p-6 text-white">
              <div className="flex items-center space-x-3 mb-2">
                <HelpCircle size={24} />
                <h2 className="text-xl font-bold">New Support Ticket</h2>
              </div>
              <p className="text-blue-100 text-sm">Fill out the form below and we'll get back to you as soon as possible.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center space-x-2">
                  <MessageSquare size={16} className="text-blue-500" />
                  <span>Your Message</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows="6"
                  placeholder="Describe your issue or question in detail..."
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none bg-gray-50"
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                loading={loading} 
                className="w-full py-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all bg-blue-600 hover:bg-blue-700"
              >
                <Send size={18} />
                <span>Send Request</span>
              </Button>
            </form>
          </Card>
        </div>

        {/* Right: Ticket History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <Clock size={24} className="text-gray-400" />
              <span>Ticket History</span>
            </h2>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64 transition-all"
              />
            </div>
          </div>

          <Card className="p-0 overflow-hidden border-gray-100">
            {fetching ? (
              <div className="p-12 text-center space-y-4">
                <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-500 animate-pulse">Fetching your support history...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <MessageSquare size={40} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">No tickets found</h3>
                <p className="text-gray-500">
                  {searchQuery ? "Try a different search term" : "You haven't created any support tickets yet."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {filteredTickets.map(ticket => (
                  <div key={ticket._id} className="p-6 hover:bg-gray-50 transition-colors group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <span className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyles(ticket.status)}`}>
                          {getStatusIcon(ticket.status)}
                          <span>{ticket.status.toUpperCase()}</span>
                        </span>
                        <span className="text-xs font-mono text-gray-400">#{ticket._id.slice(-6).toUpperCase()}</span>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">
                        {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors">
                      {ticket.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Help;
