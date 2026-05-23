import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HireHub API',
      version: '1.0.0',
      description:
        'REST API documentation for HireHub — a full-stack MERN job portal. ' +
        'Authenticate using the /api/auth/login endpoint to get a Bearer token, ' +
        'then click "Authorize" to access protected routes.',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'User registration and login' },
      { name: 'Jobs', description: 'Job listing CRUD operations' },
      { name: 'Applications', description: 'Job applications management' },
      { name: 'Admin', description: 'Admin-only user management' },
    ],
  },
  // Scan these files for JSDoc @swagger annotations
  apis: ['./routes/*.js', './controllers/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
