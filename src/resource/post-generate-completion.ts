import { FastifyInstance } from "fastify";
import { createReadStream } from "node:fs";
import {streamToResponse, OpenAIStream} from 'ai';
import {prisma} from "../lib/prisma";
import {z} from 'zod'
import { openai } from "../lib/openai";

export async function postGenerateCompletionResource(app: FastifyInstance){
    app.post('/completion', async (req, reply) => {
        const paramSchema = z.object({
            videoId: z.string().uuid()
        })

        const bodySchema = z.object({
            videoId: z.string().uuid(),
            prompt: z.string(),
            temperature: z.number().min(0).max(1).default(0.5)
        })

        const {videoId, prompt, temperature} = bodySchema.parse(req.body)

        const video = await prisma.videoInformation.findFirstOrThrow({
            where: {
                id: videoId
            }
        })

        if (!video.transcription){
            return reply.status(404).send({
                error: 'The value transcription was not found.'
            })
        }

        const promptMessage = prompt.replace('{transcription}', video.transcription)

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo-16k',
            temperature,
            messages: [
                {role: 'user', content: promptMessage}
            ],
            stream: true
        })

        const stream = OpenAIStream(response)

        streamToResponse(stream, reply.raw, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' 
            }
        })
    })
}