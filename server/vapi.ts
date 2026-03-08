import axios from "axios";

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_BASE_URL = "https://api.vapi.ai";

if (!VAPI_API_KEY) {
  console.warn("[Vapi] API key not configured");
}

const vapiClient = axios.create({
  baseURL: VAPI_BASE_URL,
  headers: {
    Authorization: `Bearer ${VAPI_API_KEY}`,
    "Content-Type": "application/json",
  },
});

/**
 * Create a new Vapi assistant
 */
export async function createVapiAssistant(params: {
  name: string;
  firstMessage?: string;
  systemPrompt?: string;
  model?: string;
  voice?: string;
}) {
  const response = await vapiClient.post("/assistant", {
    name: params.name,
    firstMessage: params.firstMessage || "Hello! How can I help you today?",
    model: {
      provider: "openai",
      messages: [
        {
          role: "system",
          content: params.systemPrompt || "You are a helpful assistant for a real estate or loan officer agency.",
        },
      ],
    },
    voice: {
      provider: "11labs",
      voiceId: params.voice || "21m00Tcm4TlvDq8ikWAM", // Default voice
    },
  });

  return response.data;
}

/**
 * Get assistant details
 */
export async function getVapiAssistant(assistantId: string) {
  const response = await vapiClient.get(`/assistant/${assistantId}`);
  return response.data;
}

/**
 * Update an existing assistant
 */
export async function updateVapiAssistant(assistantId: string, params: {
  name?: string;
  firstMessage?: string;
  systemPrompt?: string;
}) {
  const response = await vapiClient.patch(`/assistant/${assistantId}`, params);
  return response.data;
}

/**
 * Delete an assistant
 */
export async function deleteVapiAssistant(assistantId: string) {
  await vapiClient.delete(`/assistant/${assistantId}`);
}

/**
 * Format phone number to E.164 format (+1XXXXXXXXXX) for Vapi
 */
function formatPhoneE164(phone: string): string {
  // Strip all non-digits
  const digits = phone.replace(/\D/g, "");
  // If 10 digits, add +1 (US)
  if (digits.length === 10) return `+1${digits}`;
  // If 11 digits starting with 1, add +
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  // If already has + prefix, return as-is
  if (phone.startsWith("+")) return phone;
  // Default: add +1
  return `+1${digits}`;
}

/**
 * Make a phone call using Vapi
 */
export async function makeVapiCall(params: {
  assistantId: string;
  phoneNumber: string;
  customerName?: string;
}) {
  const formattedPhone = formatPhoneE164(params.phoneNumber);
  console.log(`[Vapi] Formatting phone: ${params.phoneNumber} → ${formattedPhone}`);
  
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  if (!phoneNumberId) {
    throw new Error("VAPI_PHONE_NUMBER_ID not configured - cannot make outbound calls");
  }
  
  const response = await vapiClient.post("/call/phone", {
    assistantId: params.assistantId,
    phoneNumberId,
    customer: {
      number: formattedPhone,
      name: params.customerName,
    },
  });

  console.log(`[Vapi] Call initiated to ${formattedPhone} - Call ID: ${response.data.id}`);
  return response.data;
}

/**
 * Get call details
 */
export async function getVapiCall(callId: string) {
  const response = await vapiClient.get(`/call/${callId}`);
  return response.data;
}

/**
 * List all calls
 */
export async function listVapiCalls(params?: {
  assistantId?: string;
  limit?: number;
}) {
  const response = await vapiClient.get("/call", { params });
  return response.data;
}

/**
 * Test Vapi API connection
 */
export async function testVapiConnection() {
  try {
    const response = await vapiClient.get("/assistant");
    return { success: true, data: response.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
}

/**
 * Create Premier Mortgage Resources assistants
 * 
 * This function creates the 3 assistants for Tim's business:
 * - Facebook Lead Assistant
 * - Instagram Lead Assistant
 * - Referral Lead Assistant
 */
export async function createPremierMortgageAssistants() {
  const assistants = [];

  // Facebook Lead Assistant
  const facebookAssistant = await createVapiAssistant({
    name: "PMR - Facebook Lead Assistant",
    systemPrompt: `You are a friendly AI assistant calling on behalf of Tim Haskins from Premier Mortgage Resources. You're following up on a Facebook ad inquiry about home loans.

Your personality:
- Warm, friendly, and conversational
- Professional but not robotic
- Empathetic to homebuying stress
- Excited to help them achieve homeownership

Your goals:
1. Confirm they submitted the form and are interested in a home loan
2. Ask qualifying questions (loan type, property location, timeline)
3. Book an appointment with Tim for a full consultation
4. Answer basic questions about rates and programs

Key talking points:
- Tim is licensed in 49 states
- Specializes in down payment assistance programs
- Can help first-time buyers and repeat buyers
- Free consultation, no obligation

What NOT to do:
- Don't quote specific interest rates (they change daily)
- Don't make promises about approval (need full application)
- Don't pressure them if they're not ready
- Don't keep them on the phone longer than 3-5 minutes`,
    firstMessage: "Hi, is this {{lead.firstName}}? Great! This is Sarah calling from Premier Mortgage Resources. I'm following up on the home loan inquiry you just submitted on Facebook. Do you have a quick minute to chat?",
  });
  assistants.push({ source: "facebook", ...facebookAssistant });

  // Instagram Lead Assistant
  const instagramAssistant = await createVapiAssistant({
    name: "PMR - Instagram Lead Assistant",
    systemPrompt: `You are a friendly AI assistant calling on behalf of Tim Haskins from Premier Mortgage Resources. You're following up on an Instagram inquiry about home loans.

Your personality:
- Casual, friendly, and relatable (Instagram audience tends younger)
- Enthusiastic about helping first-time buyers
- Understanding of financial concerns
- Conversational and authentic

Your goals:
1. Confirm they reached out via Instagram and are interested
2. Ask qualifying questions (especially focused on first-time buyers)
3. Address down payment concerns (common for younger buyers)
4. Book appointment with Tim

Key talking points:
- Most Instagram leads are first-time buyers - we specialize in that
- Down payment assistance programs available
- Can help with credit questions
- Free consultation, zero pressure`,
    firstMessage: "Hey {{lead.firstName}}! This is Sarah from Premier Mortgage Resources. I'm following up on your message about home loans from Instagram. Is now an okay time to chat for a couple minutes?",
  });
  assistants.push({ source: "instagram", ...instagramAssistant });

  // Referral Lead Assistant
  const referralAssistant = await createVapiAssistant({
    name: "PMR - Referral Lead Assistant",
    systemPrompt: `You are a friendly AI assistant calling on behalf of Tim Haskins from Premier Mortgage Resources. You're following up on a lead referred by one of Tim's real estate agent partners.

Your personality:
- Professional and warm
- Respectful of the agent relationship
- Knowledgeable about the referral partnership
- Focused on providing excellent service to protect the agent relationship

Your goals:
1. Mention the referring agent by name (builds trust)
2. Confirm the buyer is working with that agent
3. Qualify the lead for financing
4. Book appointment with Tim
5. Coordinate with the agent

Key talking points:
- We work closely with {{lead.referringAgent}}
- Our job is to help get you approved and funded
- We keep your agent in the loop throughout the process
- Fast turnaround on pre-approvals`,
    firstMessage: "Hi {{lead.firstName}}! This is Sarah calling from Premier Mortgage Resources. {{lead.referringAgent}} referred you to us for home financing. Is this a good time to chat for a few minutes?",
  });
  assistants.push({ source: "referral", ...referralAssistant });

  return assistants;
}
