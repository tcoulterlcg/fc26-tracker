import Anthropic from '@anthropic-ai/sdk'

export async function POST(request) {
  try {
    const body = await request.json()
    const imageBase64 = body.image
    const mediaType = body.mediaType || 'image/jpeg'

    if (!imageBase64) {
      return Response.json({ error: 'No image provided' }, { status: 400 })
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64
              }
            },
            {
              type: 'text',
              text: 'This is a screenshot from a sports video game stats screen. Extract the data into strict JSON only, no other text, no markdown code fences. Use this exact shape: {"team_summary": {"wins": number|null, "losses": number|null, "ties": number|null, "points_for": number|null, "points_against": number|null}, "player_stats": [{"name": string, "stats": {"<stat name>": number}}]}. Use whatever stat categories are actually visible in the image as keys inside "stats" (e.g. passing_yards, touchdowns, tackles, goals, assists) - do not invent categories that are not shown. If a value is not visible or not applicable, use null. Only output the JSON object, nothing else.'
            }
          ]
        }
      ]
    })

    const textBlock = message.content.find(function(block) { return block.type === 'text' })
    const rawText = textBlock ? textBlock.text : '{}'

    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch (e) {
      return Response.json({ error: 'Could not parse a valid response from the image. Try a clearer photo.' }, { status: 422 })
    }

    return Response.json(parsed)
  } catch (error) {
    return Response.json({ error: error.message || 'Something went wrong analyzing the image.' }, { status: 500 })
  }
}