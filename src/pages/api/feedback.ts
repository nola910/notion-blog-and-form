import type { APIRoute } from 'astro';
import { Client } from '@notionhq/client';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { role, category, name, message } = body;

    // Validation
    if (!message || message.trim() === '') {
      return new Response(
        JSON.stringify({ error: "Feedback message is required." }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!role || !category) {
      return new Response(
        JSON.stringify({ error: "Staff role and feedback category are required." }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const notionToken = process.env.NOTION_TOKEN || import.meta.env.NOTION_TOKEN;
    const notionDbId = process.env.NOTION_FEEDBACK_DB_ID || import.meta.env.NOTION_FEEDBACK_DB_ID;

    // Use Notion API if credentials are provided
    if (notionToken && notionDbId) {
      const notion = new Client({ auth: notionToken });

      // Build properties object
      const properties: any = {
        // Name is the default title property in Notion databases
        Name: {
          title: [
            {
              text: {
                content: name && name.trim() !== '' ? name : "Anonymous"
              }
            }
          ]
        },
        Role: {
          select: {
            name: role
          }
        },
        Category: {
          select: {
            name: category
          }
        },
        Feedback: {
          rich_text: [
            {
              text: {
                content: message
              }
            }
          ]
        }
      };

      await notion.pages.create({
        parent: { database_id: notionDbId },
        properties: properties,
      });

      return new Response(
        JSON.stringify({ success: true, message: "Feedback submitted to Notion successfully!" }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Mock response when Notion is not configured (simulate network latency)
    await new Promise((resolve) => setTimeout(resolve, 800));

    console.log("================ MOCK FEEDBACK SUBMISSION ================");
    console.log(`Submitted by: ${name || 'Anonymous'} (${role})`);
    console.log(`Category: ${category}`);
    console.log(`Message:\n${message}`);
    console.log("=========================================================");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Feedback simulated successfully!",
        isMock: true 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error("Feedback submission error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "An unexpected error occurred during submission." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
