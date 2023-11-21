import { getUser } from '@/libs/authorization';
import { checkPostLength } from '@/libs/post';
import prisma from '@/libs/prisma';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import slugify from 'slugify';

const apiCooldown = 5000;
const lastExecutionTime: { [key: string]: number } = {};

export async function POST(request: Request) {
	const body = await request.json();
	const { title, name, content } = body;

	const cookieToken = cookies().get('token')?.value;
	const { data: { user, token } } = await getUser(cookieToken);

	const now = Date.now();
	if (lastExecutionTime[user.id] && now - lastExecutionTime[user.id] < apiCooldown) {
		return NextResponse.json({ message: `Cooldown! Please wait...` }, { status: 429 });
	} lastExecutionTime[user.id] = now;

	if (!checkPostLength(title, name, content)) {
		return NextResponse.json({ message: `Failed to create a post. Check post length` }, { status: 500 });
	}

	try {
		const slug = await createUniqueSlug(title);
		const post = await prisma.post.create({
			data: {
				slug,
				title,
				name,
				content,
				authorId: user.id,
			}
		})
		let response = NextResponse.json({ message: `Post created!`, post }, { status: 200 });
		response.cookies.set({
			name: 'token',
			value: token,
			expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 год
			secure: process.env.NODE_ENV == 'production',
			path: '/'
		})
		return response;
	} catch (error) {
		return NextResponse.json({ message: `Failed to create a post` }, { status: 500 });
	}
}

async function createUniqueSlug(text: string) {
	let date = new Date();
	let month = String(date.getMonth() + 1).padStart(2, '0');
	let day = String(date.getDate()).padStart(2, '0');
	let titleSlug = slugify(text, {
		replacement: '-',
		lower: true,
		strict: true,
		locale: 'en',
	});

	let newSlug = `${titleSlug}-${month}-${day}`;
	let counter = 1;

	while (true) {
		const existingPost = await prisma.post.findFirst({
			where: { slug: newSlug }
		})

		if (!existingPost) break;

		counter++;
		newSlug = `${titleSlug}-${month}-${day}-${counter}`;
	}
	return newSlug;
}