/**
 * Twilio SMS Webhook
 * 
 * Receives incoming SMS from Tariq and routes to Operations Agent
 */

import { Router } from 'express';
import { smsCommandSystem } from '../agents/sms-command-system';

const router = Router();

/**
 * POST /api/webhooks/sms
 * Twilio sends incoming SMS here
 */
router.post('/sms', async (req, res) => {
  try {
    const { From, Body } = req.body;
    
    console.log(`[SMS Webhook] Received from ${From}: ${Body}`);
    
    // Parse the command
    const command = await smsCommandSystem.parseOwnerCommand(Body);
    
    // Route to appropriate agent
    const response = await smsCommandSystem.routeCommand(command);
    
    // Send response back to owner
    await smsCommandSystem.sendResponse(response);
    
    // Respond to Twilio
    res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (error) {
    console.error('[SMS Webhook] Error processing SMS:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error processing command</Message></Response>');
  }
});

export default router;
