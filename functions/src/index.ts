/**
 * Import function triggers from their respective sub-modules.
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { Resend } from 'resend';

// Initialize Firebase Admin SDK
initializeApp();

// Initialize Resend with your API key
// It's recommended to store this in a secret manager
const resend = new Resend(process.env.RESEND_API_KEY);

// Define the email address to send notifications to.
// In a real app, this might come from a configuration document or user profiles.
const NOTIFICATION_EMAIL_RECIPIENT = "production-leads@yourcompany.com";
const NOTIFICATION_EMAIL_FROM = "onboarding@resend.dev"; // Must be a verified domain on Resend

/**
 * Sends an email notification when a new job is created.
 */
export const onJobCreatedSendEmail = onDocumentCreated("jobs/{jobId}", async (event) => {
    logger.info("New job created, preparing to send notification.", {jobId: event.params.jobId});

    const snapshot = event.data;
    if (!snapshot) {
        logger.warn("No data associated with the event, skipping.");
        return;
    }

    const jobData = snapshot.data();

    // Although the 'job' type from the main app isn't available here,
    // we can define a minimal type for the data we expect.
    const { orderNumber, clientName, item, dueDate } = jobData as {
        orderNumber: string;
        clientName: string;
        item: { partName: string; quantity: number; };
        dueDate?: string;
    };
    
    const subject = `New Job Created: ${orderNumber} - ${item.partName}`;
    const jobUrl = `https://your-app.com/jobs/${snapshot.id}/operations`; // Replace with your actual app URL

    try {
        await resend.emails.send({
            from: NOTIFICATION_EMAIL_FROM,
            to: NOTIFICATION_EMAIL_RECIPIENT,
            subject: subject,
            html: `
                <h1>New Job Created</h1>
                <p>A new job has been created and is ready for production planning and execution.</p>
                <ul>
                    <li><strong>Job:</strong> ${orderNumber}</li>
                    <li><strong>Client:</strong> ${clientName}</li>
                    <li><strong>Part:</strong> ${item.partName}</li>
                    <li><strong>Quantity:</strong> ${item.quantity}</li>
                    <li><strong>Due Date:</strong> ${dueDate || 'N/A'}</li>
                </ul>
                <p><a href="${jobUrl}">Click here to view the job and its tasks</a></p>
            `,
        });
        logger.info(`Notification email sent for job ${snapshot.id}`);
    } catch (error) {
        logger.error(`Failed to send email for job ${snapshot.id}`, error);
    }
}); 