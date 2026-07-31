import express from 'express';
import request from 'supertest';
import { PassThrough } from 'stream';
import { encode } from 'plantuml-encoder';
import { plantumlRouter } from '../../../../src/server/routes/plantuml';
import { logger } from '../../../../src/utils/logger';

const createPlantumlModule = (svg: string) => ({
  generate: jest.fn(() => {
    const inputStream = new PassThrough();
    const outputStream = new PassThrough();

    inputStream.on('finish', () => {
      outputStream.end(svg);
    });

    return { in: inputStream, out: outputStream };
  }),
});

const createFailingPlantumlModule = (error: Error) => ({
  generate: jest.fn(() => {
    const inputStream = new PassThrough();
    const outputStream = new PassThrough();

    inputStream.on('finish', () => {
      outputStream.emit('error', error);
    });

    return { in: inputStream, out: outputStream };
  }),
});

describe('plantuml.ts', () => {
  let app: express.Application;
  let plantumlModule: ReturnType<typeof createPlantumlModule>;

  const originalPlantumlServer = process.env.PLANTUML_SERVER;
  const originalFetch = global.fetch;

  beforeEach(() => {
    delete process.env.PLANTUML_SERVER;
    plantumlModule = createPlantumlModule('<svg>diagram</svg>');
    app = express();
    app.use(express.json());
    app.use('/api/plantuml', plantumlRouter(plantumlModule));
  });

  afterEach(() => {
    if (originalPlantumlServer === undefined) {
      delete process.env.PLANTUML_SERVER;
    } else {
      process.env.PLANTUML_SERVER = originalPlantumlServer;
    }
    global.fetch = originalFetch;
  });

  describe('POST /svg', () => {
    it('should return 400 if diagram is not provided', async () => {
      const response = await request(app)
        .post('/api/plantuml/svg')
        .send({});

      expect(response.statusCode).toBe(400);
      expect(response.text).toBe('diagram body parameter is required.');
    });

    it('should return 400 if diagram is empty string', async () => {
      const response = await request(app)
        .post('/api/plantuml/svg')
        .send({ diagram: '' });

      expect(response.statusCode).toBe(400);
      expect(response.text).toBe('diagram body parameter is required.');
    });

    it('should return generated SVG when diagram is provided', async () => {
      const diagram = '@startuml\nA --> B\n@enduml';
      const response = await request(app)
        .post('/api/plantuml/svg')
        .send({ diagram });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('image/svg+xml');
      const payload = response.text ?? response.body;
      const svgBody = Buffer.isBuffer(payload) ? payload.toString() : payload;
      expect(svgBody).toBe('<svg>diagram</svg>');
      expect(plantumlModule.generate).toHaveBeenCalledWith({ format: 'svg' });
    });

    it('should return 500 when SVG generation fails', async () => {
      const error = new Error('generation failed');
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

      plantumlModule = createFailingPlantumlModule(error);
      app = express();
      app.use(express.json());
      app.use('/api/plantuml', plantumlRouter(plantumlModule));

      const response = await request(app)
        .post('/api/plantuml/svg')
        .send({ diagram: '@startuml\nA --> B\n@enduml' });

      expect(response.statusCode).toBe(500);
      expect(response.text).toBe('Error generating PlantUML diagram.');
      expect(errorSpy).toHaveBeenCalledWith('Error generating PlantUML diagram:', error);

      errorSpy.mockRestore();
    });
  });

  describe('with a custom PLANTUML_SERVER', () => {
    const serverUrl = 'http://localhost:9274/';

    it('should fetch the diagram from the configured server', async () => {
      const diagram = '@startuml\nA --> B\n@enduml';
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => '<svg>server-diagram</svg>',
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      app = express();
      app.use(express.json());
      app.use('/api/plantuml', plantumlRouter(plantumlModule, serverUrl));

      const response = await request(app)
        .post('/api/plantuml/svg')
        .send({ diagram });

      expect(fetchMock).toHaveBeenCalledWith(
        `${serverUrl.replace(/\/+$/, '')}/svg/${encode(diagram)}`
      );
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('image/svg+xml');
      expect(response.body.toString()).toBe('<svg>server-diagram</svg>');
      expect(plantumlModule.generate).not.toHaveBeenCalled();
    });

    it('should return 500 when the PlantUML server responds with an error', async () => {
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
      const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 502 });
      global.fetch = fetchMock as unknown as typeof fetch;

      app = express();
      app.use(express.json());
      app.use('/api/plantuml', plantumlRouter(plantumlModule, serverUrl));

      const response = await request(app)
        .post('/api/plantuml/svg')
        .send({ diagram: '@startuml\nA --> B\n@enduml' });

      expect(response.statusCode).toBe(500);
      expect(response.text).toBe('Error generating PlantUML diagram.');

      errorSpy.mockRestore();
    });
  });
});
