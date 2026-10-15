import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import Groq from 'groq-sdk';
import { hashPassword } from '@/lib/encryption';

const apiKeys = [
  process.env.GROQ_API_KEY,
  process.env.FALLBACK_GROQ_API_KEY,
  process.env.FALLBACK_GROQ_API_KEY_2
].filter(Boolean) as string[];

async function createCompletionWithFailover(messages: any[], tools?: any[]) {
  let lastError: any;
  for (const apiKey of apiKeys) {
    try {
      const groqClient = new Groq({ apiKey });
      const options: any = {
        messages,
        model: 'openai/gpt-oss-120b',
      };
      if (tools) {
        options.tools = tools;
        options.tool_choice = 'auto';
      }
      return await groqClient.chat.completions.create(options);
    } catch (error: any) {
      const errStr = error?.message || String(error);
      if (errStr.includes('rate_limit') || errStr.includes('tokens per minute') || error?.status === 429 || error?.status === 413) {
        lastError = error;
        console.warn(`Groq API Key ending in ${apiKey.slice(-4)} failed due to rate limits. Trying next...`);
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error("All Groq API keys hit rate limits or none were provided. Please add FALLBACK_GROQ_API_KEY to your .env");
}

const schemaStr = `
model User {
  id        String   @id @default(uuid())
  vmNo      String?  @unique
  email     String   @unique
  name      String
  role      String   @default("STUDENT") // STUDENT, FACULTY, HOD, ADMIN
  status    String   @default("ACTIVE")
}
model StudentProfile {
  userEmail   String   @id
  rollNumber  String   @unique
  department  String
  semester    Int      @default(1)
  batch       String   @default("2023-2027")
}
model FacultyProfile {
  vmNo        String   @id
  department  String
  designation String   @default("Assistant Professor")
}
model Department {
  id        String   @id @default(uuid())
  code      String   @unique
  name      String
  hodName   String?  
}
model Subject {
  id             String   @id @default(uuid())
  code           String   @unique
  name           String
  credits        Int      @default(3)
  semester       Int      @default(5)
  departmentCode String   @default("CSE")
}
model Notice {
  id        String   @id @default(uuid())
  title     String
  content   String
  category  String   @default("GENERAL")
  postedBy  String   @default("Admin")
}
model TimetableEntry {
  id          String   @id @default(uuid())
  classId     String
  dayOrder    String
  period      Int
  timeRange   String
  subjectCode String
  subjectName String
  facultyName String
  roomNo      String
}
`;

// Disallow dangerous SQL commands in database console queries
const DESTRUCTIVE_SQL_PATTERN = /\b(DROP|TRUNCATE|ALTER|GRANT|REVOKE|DATABASE|SCHEMA|SHUTDOWN)\b/i;

export async function POST(request: Request) {
  try {
    const { query, attachedData, history } = await request.json();
    
    if (!query) {
      return NextResponse.json({ success: false, reply: 'No query provided.' }, { status: 400 });
    }

    let systemContent = `You are the VM-HUB Enterprise Database Operations Engine for the Registrar and Academic Administration Office of Vel Tech Multi Tech Dr. Rangarajan Dr. Sakunthala Engineering College (Autonomous).
You have the ability to inspect database records safely using read queries and execute controlled institutional data management tools.
Here is the application database schema:

${schemaStr}

Security & Architecture Rules:
1. Passwords are cryptographic one-way salted hashes (bcrypt). They CANNOT be decrypted or viewed by anyone. If a user forgot their password, offer to reset it with a new secure password using 'update_user_password'.
2. Never execute destructive DDL statements (DROP, TRUNCATE, ALTER). Read queries must use 'read_query'.
3. To create users or reset passwords, always use the dedicated parameterized tools ('create_user', 'update_user_password').
4. Be concise, authoritative, professional, and clear. Format responses as official system logs or database execution summaries. Do NOT refer to yourself as an AI, bot, or language model.`;

    if (attachedData) {
      systemContent += `\n\nAdditionally, the user has attached data for analysis or processing:\n${JSON.stringify(attachedData).substring(0, 1000)}`;
    }

    const recentHistory = (history || []).slice(-4).map((msg: any) => {
      if (typeof msg.content === 'string' && msg.content.length > 1500) {
        return { ...msg, content: msg.content.substring(0, 1500) + '... [Truncated]' };
      }
      return msg;
    });

    const messages: any[] = [
      {
        role: 'system',
        content: systemContent
      },
      ...recentHistory,
      {
        role: 'user',
        content: query
      }
    ];

    const tools = [
      {
        type: 'function',
        function: {
          name: 'read_query',
          description: 'Executes a safe, read-only SELECT query against the PostgreSQL database. Passwords cannot be queried.',
          parameters: {
            type: 'object',
            properties: {
              sqlQuery: { type: 'string', description: 'The read-only SELECT query to execute.' }
            },
            required: ['sqlQuery']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_user',
          description: 'Creates a new user safely using salted bcrypt password hashing.',
          parameters: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              name: { type: 'string' },
              password: { type: 'string' },
              role: { type: 'string', enum: ['STUDENT', 'FACULTY', 'HOD', 'ADMIN'] },
              vmNo: { type: 'string', description: 'Roll number or VM identifier' }
            },
            required: ['email', 'name', 'password', 'role']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'update_user_password',
          description: 'Securely resets a user password using salted bcrypt hashing.',
          parameters: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              newPassword: { type: 'string' }
            },
            required: ['email', 'newPassword']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_notice',
          description: 'Publishes a new official academic notice.',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              content: { type: 'string' },
              category: { type: 'string', enum: ['GENERAL', 'URGENT', 'EXAM'] },
              audience: { type: 'string', enum: ['ALL', 'STUDENT', 'FACULTY'] }
            },
            required: ['title', 'content']
          }
        }
      }
    ];

    let currentCompletion = await createCompletionWithFailover(messages, tools);
    let currentMessage = currentCompletion.choices[0]?.message;

    let iterations = 0;
    const MAX_ITERATIONS = 4;

    while (currentMessage?.tool_calls?.length && iterations < MAX_ITERATIONS) {
      const toolCall = currentMessage.tool_calls[0];
      let dbResult: any;
      let errorStr: string | null = null;
      let toolName = toolCall.function.name;

      if (toolName === 'read_query') {
        const { sqlQuery } = JSON.parse(toolCall.function.arguments);
        const trimmed = sqlQuery.trim();
        
        // Security checks: enforce read-only SELECT queries and block destructive keywords
        if (!trimmed.toLowerCase().startsWith('select') && !trimmed.toLowerCase().startsWith('with')) {
          dbResult = 'Security Error: Only read-only SELECT queries are permitted via read_query.';
        } else if (DESTRUCTIVE_SQL_PATTERN.test(trimmed)) {
          dbResult = 'Security Error: Destructive SQL keywords are strictly forbidden.';
        } else if (/password/i.test(trimmed)) {
          dbResult = 'Security Error: Access to password hashes is restricted.';
        } else {
          try {
            dbResult = await prisma.$queryRawUnsafe(sqlQuery);
          } catch (err: any) {
            errorStr = err.message;
            dbResult = `Database error: ${errorStr}`;
          }
        }
      } else if (toolName === 'create_user') {
        const { email, name, password, role, vmNo } = JSON.parse(toolCall.function.arguments);
        try {
          const hashedPassword = await hashPassword(password);
          const cleanEmail = email.toLowerCase().trim();
          const cleanName = name.trim();
          const cleanVmNo = vmNo ? vmNo.trim() : null;

          const newUser = await prisma.user.create({
            data: {
              email: cleanEmail,
              name: cleanName,
              password: hashedPassword,
              role: role as any,
              status: "ACTIVE",
              vmNo: cleanVmNo
            }
          });

          if (cleanVmNo) {
            await prisma.userMode.upsert({
              where: { vmno: cleanVmNo },
              update: { emailid: cleanEmail, password: hashedPassword, usermode: role },
              create: { vmno: cleanVmNo, emailid: cleanEmail, password: hashedPassword, usermode: role }
            }).catch(() => null);
          }

          dbResult = `[User created successfully. ID: ${newUser.id}]`;
        } catch (err: any) {
          errorStr = err.message;
          dbResult = `Failed to create user: ${errorStr}`;
        }
      } else if (toolName === 'update_user_password') {
        const { email, newPassword } = JSON.parse(toolCall.function.arguments);
        try {
          const hashedPassword = await hashPassword(newPassword);
          const cleanEmail = email.toLowerCase().trim();

          await prisma.user.update({
            where: { email: cleanEmail },
            data: { password: hashedPassword }
          });

          const um = await prisma.userMode.findUnique({ where: { emailid: cleanEmail } }).catch(() => null);
          if (um) {
            await prisma.userMode.update({
              where: { emailid: cleanEmail },
              data: { password: hashedPassword }
            }).catch(() => null);
          }

          dbResult = `[Password reset successfully for ${cleanEmail} with salted bcrypt]`;
        } catch (err: any) {
          errorStr = err.message;
          dbResult = `Failed to update password: ${errorStr}`;
        }
      } else if (toolName === 'create_notice') {
        const { title, content, category, audience } = JSON.parse(toolCall.function.arguments);
        try {
          const notice = await prisma.notice.create({
            data: {
              title: title.trim(),
              content: content.trim(),
              category: category || "GENERAL",
              audience: audience || "ALL",
              postedBy: "Admin"
            }
          });
          dbResult = `[Notice published successfully. ID: ${notice.id}]`;
        } catch (err: any) {
          errorStr = err.message;
          dbResult = `Failed to create notice: ${errorStr}`;
        }
      } else {
        dbResult = `Unknown tool: ${toolName}`;
      }

      messages.push(currentMessage);
      
      let resultString = typeof dbResult === 'string' ? dbResult : JSON.stringify(dbResult);
      if (resultString.length > 2000) {
        resultString = resultString.substring(0, 2000) + '... [Results Truncated]';
      }

      messages.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        name: toolName,
        content: resultString
      });

      currentCompletion = await createCompletionWithFailover(messages, tools);
      currentMessage = currentCompletion.choices[0]?.message;
      iterations++;
    }

    return NextResponse.json({
      success: true,
      reply: currentMessage?.content || "I processed your request."
    });

  } catch (error: any) {
    console.error('Agent error:', error);
    return NextResponse.json({ success: false, reply: `An error occurred: ${error?.message || String(error)}` }, { status: 500 });
  }
}
