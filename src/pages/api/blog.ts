import type { APIRoute } from 'astro';
import { Client } from '@notionhq/client';

// Realistic mock blog database for ER/hospital environment
const MOCK_POSTS = [
  {
    id: "post-1",
    title: "Updated Stroke Pathway Activation Criteria",
    summary: "Starting Monday, we are modifying the threshold for stroke pathway activation in patients presenting with transient neurological deficits. Read the new criteria and visual clinical pathway flow sheet.",
    content: "Team,\n\nIn collaboration with Neurology, we are updating the PMH Stroke Pathway Activation Criteria. The goal is to reduce false activations while maintaining our excellent door-to-needle times.\n\nKey Changes:\n1. For transient symptoms (<30 mins) that have fully resolved on arrival, activate only if the ABCD2 score is >= 4 OR if there are fluctuating deficits.\n2. Please refer to the updated visual flow chart attached to the medical director's office door and on the clinical guidelines share.\n3. Make sure to document the exact time of onset and the time of resolution clearly in the HPI.\n\nThis policy goes live this Monday. Let's make sure our APCs and triage nurses are fully briefed.\n\n- Dr. TC, Medical Director",
    date: "May 22, 2026",
    tags: ["Clinical", "Protocol"],
    author: "Dr. TC, Medical Director"
  },
  {
    id: "post-2",
    title: "Introducing the Sonosite PX Ultrasound in Pod A",
    summary: "The new Sonosite PX point-of-care ultrasound machine has arrived and is docked in Pod A. It features enhanced resolution for cardiac/FAST scans and a simplified user interface.",
    content: "All staff,\n\nWe have officially retired the old Edge system and replaced it with a brand new Sonosite PX. It is permanently docked in Pod A.\n\nNew Features:\n- 15-second startup time from sleep mode.\n- Dedicated 'needle-reduction' visualization button for ultrasound-guided central lines or nerve blocks.\n- Auto-export to PACS via the wireless PMH-Clinical network.\n\nTraining:\nSuper-user training will be provided by representatives during shift change this Thursday and Friday. Short 5-minute checkout sessions are required before you sign out the transducers.\n\nKeep it clean and plug it back in after use!\n\n- ED Operations Team",
    date: "May 20, 2026",
    tags: ["Equipment", "Operations"],
    author: "ED Operations Team"
  },
  {
    id: "post-3",
    title: "Summer Shift Scheduling & Trade Policies",
    summary: "As we enter peak vacation season, please review the rules regarding shift trades, coverage requirements, and submission deadlines on scheduling platforms.",
    content: "APCs and Physicians,\n\nSummer is our busiest time for vacation requests. To keep the department running safely, please adhere to these scheduling guidelines:\n\n1. All shift trades must be submitted on the schedule platform at least 72 hours prior to the shift.\n2. Double-coverage slots (12:00 to 22:00) cannot be traded for single-coverage overnight slots without direct approval from the scheduler.\n3. A maximum of 3 trades per provider per month is permitted during June, July, and August.\n\nThank you for working together to keep the board clear.\n\n- Dr. TC, Medical Director",
    date: "May 18, 2026",
    tags: ["Staffing", "Policy"],
    author: "Dr. TC, Medical Director"
  },
  {
    id: "post-4",
    title: "Pediatric Sepsis Order Set Updates in EMR",
    summary: "Our pediatric clinical decision support order set has been updated in the EMR. Main changes include weight-adjusted fluid bolus defaults and accelerated lab routing.",
    content: "Staff,\n\nThe Pediatric Sepsis Order Set has been revised to reflect the 2026 Surviving Sepsis guidelines.\n\nChanges:\n- Fluid resuscitation defaults to 20 mL/kg of balanced crystalloid (Lactated Ringer's preferred over Normal Saline).\n- Blood culture orders are automatically routed as 'STAT-Critical' to the lab.\n- Empiric antibiotic recommendations now default to weight-based Ceftriaxone + Vancomycin with automatic pharmacist verification.\n\nPlease utilize the pediatric sepsis order set for any child with a suspected source of infection presenting with abnormal vitals.\n\n- Clinical Informatics Committee",
    date: "May 15, 2026",
    tags: ["Clinical", "Protocol"],
    author: "Clinical Committee"
  },
  {
    id: "post-5",
    title: "ED Flow: Target Door-to-Provider Times",
    summary: "An update on our key performance metrics. We have seen a slight increase in door-to-provider times this past month. Here are the flow adjustments we are testing.",
    content: "Team,\n\nOur door-to-provider (D2P) times rose to an average of 24 minutes last month, up from our target of 18 minutes. This is largely driven by high boarding counts in the main hospital, but we can optimize our front-end flow.\n\nWe are testing a 'Provider at Triage' pilot program during peak hours (11:00 to 19:00) starting next week. A physician or APC will be stationed at triage to initiate labs, order imaging, and discharge low-acuity (ESI 4 and 5) patients immediately.\n\nYour participation and feedback on this flow pilot are highly appreciated.\n\n- Dr. TC, Medical Director",
    date: "May 10, 2026",
    tags: ["Operations"],
    author: "Dr. TC, Medical Director"
  },
  {
    id: "post-6",
    title: "Accreditation Preparedness Checklist",
    summary: "The joint commission audit is approaching in late Q3. Please review the safety compliance rules, including food in clinical areas and medication security.",
    content: "All staff,\n\nOur accreditation survey window opens next month. Let's make sure we are 100% compliant. Focus on these areas:\n\n- **No Food/Drink in Clinical Zones**: Only closed water containers are allowed in the central nurse station desk drawer, and no food is permitted at provider computer desks.\n- **Medication Security**: Never leave medication vials or prepped syringes unattended. All carts must be locked when not in use.\n- **Patient Boarding**: Ensure all hallways are clear. Maintain a 36-inch clearance in all corridors.\n\nThank you for maintaining a safe environment for our patients and staff.\n\n- ED Administration",
    date: "May 05, 2026",
    tags: ["Policy", "Operations"],
    author: "ED Administration"
  }
];

export const GET: APIRoute = async ({ url }) => {
  const cursorParam = url.searchParams.get('cursor');
  const limitParam = parseInt(url.searchParams.get('limit') || '3', 10);

  const notionToken = process.env.NOTION_TOKEN || import.meta.env.NOTION_TOKEN;
  const notionDbId = process.env.NOTION_BLOG_DB_ID || import.meta.env.NOTION_BLOG_DB_ID;

  // Use Notion API if keys are provided
  if (notionToken && notionDbId) {
    try {
      const notion = new Client({ auth: notionToken });
      
      const queryParams: any = {
        database_id: notionDbId,
        page_size: limitParam,
        sorts: [
          {
            property: 'Date',
            direction: 'descending',
          },
        ],
      };

      if (cursorParam) {
        queryParams.start_cursor = cursorParam;
      }

      // Filter to only published posts if a Published checkbox exists in database
      queryParams.filter = {
        property: 'Published',
        checkbox: {
          equals: true
        }
      };

      const response = await notion.databases.query(queryParams);

      // Parse Notion pages into clean JSON
      const posts = await Promise.all(
        response.results.map(async (page: any) => {
          const props = page.properties;
          
          // Helper to extract Title
          const title = props.Title?.title?.[0]?.plain_text || 
                        props.Name?.title?.[0]?.plain_text || "Untitled Post";
          
          // Helper to extract Summary
          const summary = props.Summary?.rich_text?.[0]?.plain_text || 
                          props.Description?.rich_text?.[0]?.plain_text || "";
          
          // Helper to extract Tags (Multi-select)
          const tags = props.Tags?.multi_select?.map((item: any) => item.name) || [];
          
          // Helper to extract Date
          const rawDate = props.Date?.date?.start || page.created_time;
          const formattedDate = new Date(rawDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          // Helper to extract Author
          const author = props.Author?.rich_text?.[0]?.plain_text || 
                         props.Author?.people?.[0]?.name || "Medical Director";

          // Fetch page content blocks for full text
          let content = summary;
          try {
            const blocks = await notion.blocks.children.list({ block_id: page.id });
            const textBlocks = blocks.results
              .map((block: any) => {
                if (block.type === 'paragraph') {
                  return block.paragraph?.rich_text?.map((t: any) => t.plain_text).join('') || '';
                }
                if (block.type === 'heading_1') {
                  return `\n# ${block.heading_1?.rich_text?.map((t: any) => t.plain_text).join('') || ''}\n`;
                }
                if (block.type === 'heading_2') {
                  return `\n## ${block.heading_2?.rich_text?.map((t: any) => t.plain_text).join('') || ''}\n`;
                }
                if (block.type === 'heading_3') {
                  return `\n### ${block.heading_3?.rich_text?.map((t: any) => t.plain_text).join('') || ''}\n`;
                }
                if (block.type === 'bulleted_list_item') {
                  return `- ${block.bulleted_list_item?.rich_text?.map((t: any) => t.plain_text).join('') || ''}`;
                }
                if (block.type === 'numbered_list_item') {
                  return `1. ${block.numbered_list_item?.rich_text?.map((t: any) => t.plain_text).join('') || ''}`;
                }
                return '';
              })
              .filter(Boolean);
            
            if (textBlocks.length > 0) {
              content = textBlocks.join('\n');
            }
          } catch (blockErr) {
            console.error("Error fetching blocks from Notion page:", blockErr);
          }

          return {
            id: page.id,
            title,
            summary,
            content,
            date: formattedDate,
            tags,
            author,
          };
        })
      );

      return new Response(
        JSON.stringify({
          posts,
          next_cursor: response.next_cursor,
          has_more: response.has_more,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );

    } catch (error: any) {
      console.error("Notion API Error, falling back to mock data:", error);
      // Fall through to mock data on API error, so website doesn't crash
    }
  }

  // Fallback Mock Logic with Pagination
  const startIndex = cursorParam ? parseInt(cursorParam, 10) : 0;
  const endIndex = startIndex + limitParam;
  const paginatedPosts = MOCK_POSTS.slice(startIndex, endIndex);
  const hasMore = endIndex < MOCK_POSTS.length;
  const nextCursor = hasMore ? String(endIndex) : null;

  return new Response(
    JSON.stringify({
      posts: paginatedPosts,
      next_cursor: nextCursor,
      has_more: hasMore,
      isMock: true
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
