/**
 * Email Templates for Appointment Workflow
 */

export interface AppointmentEmailData {
  firstName: string;
  lastName: string;
  appointmentDate: Date;
  duration?: number;
  appointmentType?: string;
}

export function getAppointmentConfirmationEmail(data: AppointmentEmailData): string {
  const dateStr = data.appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const timeStr = data.appointmentDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">Appointment Confirmed! 🎉</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 18px; color: #111827; margin-bottom: 20px;">
          Hi ${data.firstName},
        </p>
        
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          Great news! Your consultation with Tim Haskins has been confirmed.
        </p>
        
        <div style="background: white; border-left: 4px solid #2563eb; padding: 20px; margin: 25px 0; border-radius: 5px;">
          <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 20px;">Appointment Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">Date:</td>
              <td style="padding: 10px 0; color: #111827;">${dateStr}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">Time:</td>
              <td style="padding: 10px 0; color: #111827;">${timeStr}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">Duration:</td>
              <td style="padding: 10px 0; color: #111827;">${data.duration || 30} minutes</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">With:</td>
              <td style="padding: 10px 0; color: #111827;">Tim Haskins, NMLS #1116876</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 5px; margin: 25px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px;">📋 What to Prepare</h3>
          <ul style="margin: 10px 0; padding-left: 20px; color: #374151; line-height: 1.8;">
            <li>Your current financial situation</li>
            <li>Questions about loan programs</li>
            <li>Property details (if you have a specific home in mind)</li>
            <li>Employment and income information</li>
          </ul>
        </div>
        
        <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-top: 25px;">
          We'll send you reminders before your appointment. If you need to reschedule, 
          please contact us as soon as possible.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="tel:+17025551234" style="display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; font-size: 16px;">
            Call Us: (702) 555-1234
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <div style="text-align: center; color: #6b7280; font-size: 14px;">
          <p style="margin: 5px 0;"><strong>Premier Mortgage Resources</strong></p>
          <p style="margin: 5px 0;">Tim Haskins, NMLS #1116876</p>
          <p style="margin: 5px 0;">Email: tim@lockinloans.com</p>
        </div>
      </div>
    </div>
  `;
}

export function getAppointmentReminderEmail(data: AppointmentEmailData & { hoursUntil: number }): string {
  const dateStr = data.appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const timeStr = data.appointmentDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const reminderText = data.hoursUntil === 24 
    ? 'Your appointment is tomorrow!' 
    : 'Your appointment is in 2 hours!';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">⏰ Appointment Reminder</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 18px; color: #111827; margin-bottom: 20px;">
          Hi ${data.firstName},
        </p>
        
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          <strong>${reminderText}</strong> This is a friendly reminder about your upcoming consultation with Tim Haskins.
        </p>
        
        <div style="background: white; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 5px;">
          <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 20px;">Appointment Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">Date:</td>
              <td style="padding: 10px 0; color: #111827;">${dateStr}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">Time:</td>
              <td style="padding: 10px 0; color: #111827;">${timeStr}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">Duration:</td>
              <td style="padding: 10px 0; color: #111827;">${data.duration || 30} minutes</td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="tel:+17025551234" style="display: inline-block; background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; font-size: 16px;">
            Call if You Need to Reschedule
          </a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 25px;">
          Looking forward to speaking with you!
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <div style="text-align: center; color: #6b7280; font-size: 14px;">
          <p style="margin: 5px 0;"><strong>Premier Mortgage Resources</strong></p>
          <p style="margin: 5px 0;">Tim Haskins, NMLS #1116876</p>
          <p style="margin: 5px 0;">Email: tim@lockinloans.com</p>
        </div>
      </div>
    </div>
  `;
}

export function getPostAppointmentFollowUpEmail(data: AppointmentEmailData): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">Thank You for Meeting With Us! 🙏</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 18px; color: #111827; margin-bottom: 20px;">
          Hi ${data.firstName},
        </p>
        
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          Thank you for taking the time to meet with us! We're excited to help you achieve your homeownership goals.
        </p>
        
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 5px; margin: 25px 0;">
          <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 18px;">📝 Next Steps</h3>
          <ol style="margin: 10px 0; padding-left: 20px; color: #374151; line-height: 1.8;">
            <li>Review the loan programs we discussed</li>
            <li>Gather the required documentation</li>
            <li>Submit your pre-approval application</li>
            <li>Start your home search with confidence!</li>
          </ol>
        </div>
        
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          If you have any questions or need clarification on anything we discussed, 
          please don't hesitate to reach out. We're here to help every step of the way.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="mailto:tim@lockinloans.com" style="display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; font-size: 16px; margin: 0 10px 10px 0;">
            Email Us
          </a>
          <a href="tel:+17025551234" style="display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; font-size: 16px; margin: 0 10px 10px 0;">
            Call Us
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <div style="text-align: center; color: #6b7280; font-size: 14px;">
          <p style="margin: 5px 0;"><strong>Premier Mortgage Resources</strong></p>
          <p style="margin: 5px 0;">Tim Haskins, NMLS #1116876</p>
          <p style="margin: 5px 0;">Email: tim@lockinloans.com | Phone: (702) 555-1234</p>
        </div>
      </div>
    </div>
  `;
}
