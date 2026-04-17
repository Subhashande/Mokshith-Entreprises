import express from 'express';
import * as controller from './settings.controller.js';

const router = express.Router();

router.post('/', controller.updateSetting);
router.get('/:key', controller.getSetting);

export default router;