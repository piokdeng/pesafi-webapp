import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('Testing email send to:', email);
    console.log('Using sender:', 'KermaPay <onboarding@resend.dev>');

    const result = await resend.emails.send({
      from: 'KermaPay <onboarding@resend.dev>',
      to: email,
      subject: 'Test Email from KermaPay',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Test Email</h2>
          <p>This is a test email to verify that email sending is working correctly.</p>
          <p>If you receive this email, the email service is configured properly.</p>
          <p style="color: #666; font-size: 12px; margin-top: 32px;">Sent from KermaPay at ${new Date().toISOString()}</p>
        </div>
      `,
    });

    console.log('Test email sent successfully:', result);

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      result
    });

  } catch (error) {
    console.error('Error sending test email:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}
