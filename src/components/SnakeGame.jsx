import { useState, useEffect, useCallback, useRef } from 'react'

const GRID_SIZE = 20// Increased from 20 to 25
const CELL_SIZE = 30 // Increased from 20 to 30
const INITIAL_SNAKE = [{ x: 12, y: 12 }] // Adjusted position for larger grid
const INITIAL_FOOD = { x: 6, y: 6 } // Adjusted position for larger grid
const INITIAL_FPS = 10

const SnakeGame = () => {
  const [snake, setSnake] = useState(INITIAL_SNAKE)
  const [food, setFood] = useState(INITIAL_FOOD)
  const [direction, setDirection] = useState('RIGHT')
  const [isGameOver, setIsGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [isStarted, setIsStarted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [fps, setFps] = useState(INITIAL_FPS)
  const [highScore, setHighScore] = useState(
    () => JSON.parse(localStorage.getItem('highScore')) || 0
  )
  const [showSettings, setShowSettings] = useState(false)
  const lastRenderTimeRef = useRef(0)
  const animationFrameId = useRef()
  const eatSound = useRef(null)
  const gameOverSound = useRef(null)
  const bgMusic = useRef(null) // Background music
  const directionRef = useRef(direction) // Initialize ref with initial direction

  // Touch positions
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  
  // Synchronize direction state with ref
  useEffect(() => {
    directionRef.current = direction
  }, [direction])

  // Initialize audio on component mount
  useEffect(() => {
    eatSound.current = new Audio('/sounds/eat.mp3')
    gameOverSound.current = new Audio('/sounds/gameover.mp3')
    bgMusic.current = new Audio('/sounds/background.mp3') // Background music

    // Preload audio
    eatSound.current.preload = 'auto'
    gameOverSound.current.preload = 'auto'
    bgMusic.current.preload = 'auto'
    bgMusic.current.loop = true // Loop the background music

    // Optionally start background music on mount
    // bgMusic.current.play().catch(err => {
    //   console.error('Background music playback failed:', err)
    // })
  }, [])

  const generateFood = useCallback(() => {
    let newFood
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      }
      if (!snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
        break
      }
    }
    setFood(newFood)
  }, [snake])

  const resetGame = () => {
    setSnake(INITIAL_SNAKE)
    setDirection('RIGHT')
    setIsGameOver(false)
    setScore(0)
    setFps(INITIAL_FPS)
    generateFood()
    setIsStarted(false)
    setIsPaused(false)
    // Removed bgMusic.current.pause()
  }

  const startGame = () => {
    setIsStarted(true)
    bgMusic.current.play().catch(err => {
      console.error('Background music playback failed:', err)
    })
  }

  const checkCollision = (head) => {
    if (
      head.x < 0 ||
      head.x >= GRID_SIZE ||
      head.y < 0 ||
      head.y >= GRID_SIZE
    ) {
      return true
    }
  
    // Skip the head by slicing the array from index 1
    for (let segment of snake.slice(1)) {
      if (head.x === segment.x && head.y === segment.y) {
        return true
      }
    }
    return false
  }

  const moveSnake = useCallback(() => {
    if (isGameOver || !isStarted || isPaused) return

    setSnake(prevSnake => {
      const head = { ...prevSnake[0] }

      switch (directionRef.current) { // Use ref instead of state
        case 'UP':
          head.y -= 1
          break
        case 'DOWN':
          head.y += 1
          break
        case 'LEFT':
          head.x -= 1
          break
        case 'RIGHT':
          head.x += 1
          break
      }

      if (checkCollision(head)) {
        if (gameOverSound.current) {
          gameOverSound.current.play().catch(err => {
            console.error('Game Over sound playback failed:', err)
          })
        }
        setIsGameOver(true)
        if (score > highScore) {
          setHighScore(score)
          localStorage.setItem('highScore', JSON.stringify(score))
        }
        return prevSnake
      }

      const newSnake = [head, ...prevSnake]

      if (head.x === food.x && head.y === food.y) {
        setScore(prev => prev + 1)
        if (eatSound.current) {
          eatSound.current.play().catch(err => {
            console.error('Eat sound playback failed:', err)
          })
        }
        generateFood()
        setFps(prevFps => prevFps + 1)
      } else {
        newSnake.pop()
      }

      return newSnake
    })
  }, [food, generateFood, isGameOver, isStarted, isPaused, score, highScore])

  const gameLoop = useCallback((currentTime) => {
    const secondsSinceLastRender = (currentTime - lastRenderTimeRef.current) / 1000

    if (secondsSinceLastRender < 1 / fps) {
      animationFrameId.current = requestAnimationFrame(gameLoop)
      return
    }

    lastRenderTimeRef.current = currentTime
    moveSnake()

    if (!isGameOver) {
      animationFrameId.current = requestAnimationFrame(gameLoop)
    }
  }, [moveSnake, isGameOver, fps])

  useEffect(() => {
    if (isStarted && !isGameOver && !isPaused) {
      animationFrameId.current = requestAnimationFrame(gameLoop)
    }
    return () => {
      cancelAnimationFrame(animationFrameId.current)
    }
  }, [gameLoop, isStarted, isGameOver, isPaused])

  useEffect(() => {
    const handleKeyPress = (e) => {
      const newDirection = e.key.replace('Arrow', '').toUpperCase()
      
      // Define opposite directions to prevent reversing
      const opposites = {
        UP: 'DOWN',
        DOWN: 'UP',
        LEFT: 'RIGHT',
        RIGHT: 'LEFT',
      }

      if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(newDirection)) {
        if (newDirection !== opposites[directionRef.current]) {
          setDirection(newDirection)
          directionRef.current = newDirection
        }
      }

      switch (e.key) {
        case ' ':
          if (isStarted && !isGameOver) {
            setIsPaused(prev => !prev)
          }
          break
        case 'Enter':
          if (isGameOver) {
            resetGame()
            startGame()
          }
          break
        default:
          break
      }
    }
  
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [isStarted, isGameOver])

  // Touch event handlers
  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
  }

  const handleTouchEnd = (e) => {
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartX.current
    const deltaY = touch.clientY - touchStartY.current

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 30) {
        changeDirection('RIGHT')
      } else if (deltaX < -30) {
        changeDirection('LEFT')
      }
    } else {
      if (deltaY > 30) {
        changeDirection('DOWN')
      } else if (deltaY < -30) {
        changeDirection('UP')
      }
    }
  }

  const changeDirection = (newDirection) => {
    const opposites = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
    }

    if (newDirection !== opposites[directionRef.current]) {
      setDirection(newDirection)
      directionRef.current = newDirection
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-gray-800 to-gray-900 p-4 relative">
      {/* Game Menu Overlay */}
      {!isStarted && !isGameOver && (
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center z-10 bg-black bg-opacity-75">
          <div className="text-6xl font-bold text-white mb-6">Snake Game</div> {/* Increased font size */}
          <div className="text-xl text-gray-300 mb-8">Press Spacebar to Start</div> {/* Increased font size */}
          <button
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-8 rounded transition mb-4" // Increased padding
            onClick={startGame}
          >
            Start Game
          </button>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded transition mb-4" // Increased padding
            onClick={() => setShowSettings(true)}
          >
            Settings
          </button>
          <button
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-8 rounded transition" // Increased padding
            onClick={() => alert('Exit functionality not implemented')}
          >
            Exit
          </button>
        </div>
      )
    }
      {/* Game Over Overlay */}
      {isGameOver && (
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center z-10 bg-black bg-opacity-75">
          <div className="text-6xl font-bold text-red-500 mb-6">Game Over!</div> {/* Increased font size */}
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded transition mb-4" // Increased padding
            onClick={() => {
              resetGame()
              startGame()
            }}
          >
            Play Again
          </button>
        </div>
      )}
  
      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center z-20 bg-black bg-opacity-75">
          <div className="bg-gray-800 p-12 rounded-lg shadow-lg"> {/* Increased padding */}
            <div className="text-3xl font-bold text-white mb-6">Settings</div> {/* Increased font size */}
            <div className="mb-6">
              <label className="text-white text-lg">Game Speed (FPS): </label> {/* Increased font size */}
              <input
                type="number"
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                className="ml-4 p-2 rounded text-black text-lg" // Increased padding and font size
              />
            </div>
            <button
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-8 rounded transition mr-4" // Increased padding
              onClick={() => setShowSettings(false)}
            >
              Save
            </button>
            <button
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-8 rounded transition" // Increased padding
              onClick={() => setShowSettings(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
  
      {/* Rest of your game UI */}
      <div className="mb-6 text-5xl font-extrabold text-white">Snake Game</div> {/* Increased font size */}
      <div className="flex items-center mb-6 space-x-6"> {/* Increased margin bottom and spacing */}
        <div className="text-2xl text-white">Score: {score}</div> {/* Increased font size */}
        <div className="text-2xl text-yellow-300">High Score: {highScore}</div> {/* Increased font size */}
        {isStarted && (
          <div className="text-2xl text-white">
            {isPaused ? 'Paused' : `Speed: ${fps} FPS`}
          </div>
        )}
      </div>
      <div 
        className="border-4 border-white bg-gray-700"
        style={{
          width: GRID_SIZE * CELL_SIZE, // Updated width
          height: GRID_SIZE * CELL_SIZE, // Updated height
          position: 'relative',
          borderRadius: '12px',
          boxShadow: '0 0 20px rgba(0,0,0,0.7)' // Increased shadow intensity
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {snake.map((segment, index) => (
          <div
            key={index}
            className={`absolute transition-transform duration-100 ${
              index === 0 ? 'snake-head' : 'snake-body'
            }`}
            style={{
              width: CELL_SIZE, // Updated size
              height: CELL_SIZE, // Updated size
              borderRadius: '50%',
              transform: `translate(${segment.x * CELL_SIZE}px, ${segment.y * CELL_SIZE}px)`,
              transition: 'transform 0.1s linear',
              boxShadow: 'inset -3px -3px 8px rgba(0,0,0,0.3)', // Enhanced shadow
              background: index === 0 
                ? 'linear-gradient(45deg, #FFD700, #FFA500)' 
                : 'linear-gradient(45deg, #32CD32, #228B22)'
            }}
          />
        ))}
        <div
          className="bg-red-500 absolute animate-pulse"
          style={{
            width: CELL_SIZE, // Updated size
            height: CELL_SIZE, // Updated size
            borderRadius: '50%',
            transform: `translate(${food.x * CELL_SIZE}px, ${food.y * CELL_SIZE}px)`,
            animationDuration: '1s', // Slowed animation for better visibility
            boxShadow: '0 0 15px rgba(255,0,0,0.7)' // Enhanced shadow
          }}
        />
      </div>
      {isStarted && !isGameOver && (
        <div className="mt-6">
          <button
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded transition text-lg" // Increased padding and font size
            onClick={() => setIsPaused(prev => !prev)}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>
      )}
    </div>
  )
}

export default SnakeGame