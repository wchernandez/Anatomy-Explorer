// Reads the same .txt files used by InfoPanel and auto-generates quiz questions
// No questions.json needed — every bone with a description file gets questions

const scriptFiles = import.meta.glob('/src/data/script/*.txt', { query: '?raw', import: 'default' })

function displayName(filename) {
  return filename
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export async function generateQuestions(level, count = 10) {
  const paths = Object.keys(scriptFiles)

  // Load all bones and their descriptions
  const bones = []
  for (const path of paths) {
    const filename = path.split('/').pop().replace('.txt', '')
    try {
      const description = await scriptFiles[path]()
      bones.push({ name: filename, display: displayName(filename), description: description.trim() })
    } catch {
      bones.push({ name: filename, display: displayName(filename), description: '' })
    }
  }

  if (bones.length === 0) return []

  // Pick `count` random bones for this quiz run
  const shuffled = [...bones].sort(() => Math.random() - 0.5).slice(0, count)

  return shuffled.map(bone => {
    if (level === 1) {
      // 3 random distractors from the full pool
      const distractors = bones
        .filter(b => b.name !== bone.name)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(b => b.display)
      const options = [bone.display, ...distractors].sort(() => Math.random() - 0.5)
      return {
        level: 1,
        target: bone.name,
        answer: bone.display,
        prompt: 'What bone is highlighted?',
        options,
      }
    }

    if (level === 2) {
      return {
        level: 2,
        target: bone.name,
        prompt: `Click the ${bone.display.toUpperCase()} on the model.`,
      }
    }

    if (level === 3) {
      // Use first sentence of the description as the clue
      const firstSentence = bone.description.split(/\.\s+/)[0].trim() + '.'
      return {
        level: 3,
        target: bone.name,
        prompt: firstSentence || `Find the ${bone.display} on the model.`,
      }
    }

    if (level === 4) {
      return {
        level: 4,
        target: bone.name,
        answer: bone.display,
        prompt: 'Type the name of the highlighted bone.',
        synonyms: [],
      }
    }
  })
}
