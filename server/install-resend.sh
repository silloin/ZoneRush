#!/bin/bash

# Install Resend and remove nodemailer
echo "Installing Resend email service..."

# Remove nodemailer
npm uninstall nodemailer

# Install resend
npm install resend

echo "Resend installation complete!"
echo ""
echo "Next steps:"
echo "1. Get your Resend API key from https://resend.com"
echo "2. Add RESEND_API_KEY to your environment variables"
echo "3. Optional: Add RESEND_FROM_EMAIL (defaults to onboarding@resend.dev)"
echo "4. Optional: Set DISABLE_EMAIL=true to disable emails"
