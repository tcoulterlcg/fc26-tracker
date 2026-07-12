import Anthropic from '@anthropic-ai/sdk'

export async function POST(request) {
  try {
    const body = await request.json()
    const imageBase64 = body.image
    const mediaType = body.mediaType || 'image/jpeg'
    const game = body.game || 'EA FC 26'

    if (!imageBase64) {
      return Response.json({ error: 'No image provided' }, { status: 400 })
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
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
              text: 'This is a screenshot from the video game "' + game + '" showing either a team roster list or a depth chart screen. Extract every player visible into strict JSON only, no other text, no markdown code fences. Use this exact shape: {"players": [{"name": string, "position": string, "jersey_number": number|null, "overall_rating": number|null, "depth_rank": number|null}]}. Rules: "position" should use the short in-game abbreviation (e.g. QB, HB, WR, LT, CB for EA College Football; GK, CB, CDM, ST for EA FC). "depth_rank" is the 1-based rank of the player within their position group as shown on screen (1 = the starter/top of that position\'s list, 2 = second string, etc) - only set this when the screenshot is clearly a depth-chart-style view with players grouped under position headers in ranked order; if it\'s a flat, alphabetical, or sortable roster table instead, leave depth_rank null for every player. Only include jersey_number or overall_rating if a number is actually visible next to that player, otherwise null. Extract every player row visible even if some fields are missing. Only output the JSON object, nothing else.'
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

    if (!parsed.players) {
      parsed.players = []
    }

    return Response.json(parsed)
  } catch (error) {
    return Response.json({ error: error.message || 'Something went wrong analyzing the image.' }, { status: 500 })
  }
}
