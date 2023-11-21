import { verifyJWT } from "@/libs/token";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
	try {
		const token = await request.text();
		const data = await verifyJWT(true, token);
		return NextResponse.json({ message: 'You have successfully logged in!', data }, { status: 200 })
	} catch (error) {
		console.log("Err", error)
	}
}