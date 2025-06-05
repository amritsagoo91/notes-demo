const express = require('express')
const morgan = require('morgan')
const Note = require('./models/note')
require('dotenv').config()

const app = express()

// --- Middleware: Built-in ---
app.use(express.json())
app.use(express.static('dist'))

// --- Middleware: Morgan Logging ---
morgan.token('postData', (req, res) => {
    return req.method === 'POST' ? JSON.stringify(req.body) : ''
})

// Logs POST requests with body
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :postData', {
    skip: (req) => req.method !== 'POST'
}))

// Logs everything else // app.use(morgan('tiny'))
app.use(morgan('tiny', {
    skip: (req) => req.method === 'POST'
}))

// --- Routes ---
app.get('/api/notes', (request, response) => {
    Note.find({}).then(notes => response.json(notes))
})

app.get('/api/notes/:id', (request, response, next) => {
    Note.findById(request.params.id)
        .then(note => {
            if (note) {
                response.json(note)
            } else {
                response.status(404).end()
            }
        })
        .catch(error => next(error))
})

app.post('/api/notes', (request, response, next) => {
    const body = request.body

    if (!body.content) {
        return response.status(400).json({ error: 'content missing' })
    }

    const note = new Note({
        content: body.content,
        important: body.important || false,
    })

    note.save()
        .then(savedNote => response.json(savedNote))
        .catch(error => next(error))
})

app.delete('/api/notes/:id', (request, response, next) => {
    Note.findByIdAndRemove(request.params.id)
        .then(() => response.status(204).end())
        .catch(error => next(error))
})

// --- Middleware: Unknown Endpoint ---
const unknownEndpoint = (request, response) => {
    response.status(404).send({ error: 'unknown endpoint' })
}
app.use(unknownEndpoint)

// --- Middleware: Central Error Handler ---
const errorHandler = (error, request, response, next) => {
    console.error(error.message)

    if (error.name === 'CastError') {
        return response.status(400).send({ error: 'malformatted id' })
    }

    next(error)
}
app.use(errorHandler)

// --- Start Server ---
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
