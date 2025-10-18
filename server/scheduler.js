// Simple cron-based scheduler for nightly updates (UTC)
import { CronJob } from 'cron';

export class DataScheduler {
  constructor(appPort) {
    this.port = appPort || process.env.PORT || 5002;
    this.jobs = [];
    this.baseUrl = `http://127.0.0.1:${this.port}`;
  }

  log(...args) {
    console.log('[Scheduler]', ...args);
  }

  async safePost(path) {
    try {
      const url = `${this.baseUrl}${path}`;
      const resp = await fetch(url, { method: 'POST' });
      if (!resp.ok) {
        this.log('POST failed', path, resp.status);
        return null;
      }
      const data = await resp.json().catch(() => ({}));
      this.log('POST ok', path, data?.status || resp.status);
      return data;
    } catch (e) {
      this.log('POST error', path, e?.message || e);
      return null;
    }
  }

  start() {
    // 01:00 UTC — обновить цены во всех таблицах
    const prices0100 = new CronJob('0 0 1 * * *', async () => {
      this.log('Run: nightly prices update (all tables)');
      // Обновляем отдельные таблицы, чтобы распараллелить/разгрузить
      await Promise.all([
        this.safePost('/api/companies/update-prices'),
        this.safePost('/api/sp500/update-prices'),
        this.safePost('/api/nasdaq100/update-prices'),
        this.safePost('/api/dowjones/update-prices'),
      ]);
    }, null, true, 'UTC');
    this.jobs.push(prices0100);

    // 02:00 UTC — резервное обновление цен (на случай пропуска 01:00)
    const prices0200 = new CronJob('0 0 2 * * *', async () => {
      this.log('Run: backup prices update (all tables)');
      await Promise.all([
        this.safePost('/api/companies/update-prices'),
        this.safePost('/api/sp500/update-prices'),
        this.safePost('/api/nasdaq100/update-prices'),
        this.safePost('/api/dowjones/update-prices'),
      ]);
    }, null, true, 'UTC');
    this.jobs.push(prices0200);

    // 01:20 UTC — финансы/метрики DCF
    const financials0120 = new CronJob('0 20 1 * * *', async () => {
      this.log('Run: financial data enhancement');
      await this.safePost('/api/companies/enhance-financial-data');
    }, null, true, 'UTC');
    this.jobs.push(financials0120);

    // 01:30 UTC — доходности (3/5/10Y)
    const returns0130 = new CronJob('0 30 1 * * *', async () => {
      this.log('Run: returns enhancement');
      await this.safePost('/api/companies/enhance-returns');
    }, null, true, 'UTC');
    this.jobs.push(returns0130);

    // 01:40 UTC — просадки (3/5/10Y)
    const drawdown0140 = new CronJob('0 40 1 * * *', async () => {
      this.log('Run: drawdown enhancement');
      await this.safePost('/api/companies/enhance-drawdown');
    }, null, true, 'UTC');
    this.jobs.push(drawdown0140);

    // 20:30 UTC — обновить состав индексов (вставить новые/удалить удалённые)
    const indices2030 = new CronJob('0 30 20 * * *', async () => {
      this.log('Run: indices refresh (sp500/nasdaq100/dowjones)');
      await Promise.all([
        this.safePost('/api/import/sp500-refresh'),
        this.safePost('/api/import/nasdaq100-refresh'),
        this.safePost('/api/import/dowjones-refresh'),
      ]);
    }, null, true, 'UTC');
    this.jobs.push(indices2030);

    this.log('Started', this.jobs.length, 'cron jobs');

    // Catch-up запуск при старте: если сервер поднят в ночное окно, запустить обновление цен один раз
    const hour = new Date().getUTCHours();
    const catchupEnabled = (process.env.SCHEDULER_CATCHUP_ENABLED || 'true').toLowerCase() !== 'false';
    if (catchupEnabled && hour >= 0 && hour <= 6) {
      setTimeout(() => {
        this.log('Catch-up: triggering prices update shortly after start');
        Promise.all([
          this.safePost('/api/companies/update-prices'),
          this.safePost('/api/sp500/update-prices'),
          this.safePost('/api/nasdaq100/update-prices'),
          this.safePost('/api/dowjones/update-prices'),
        ]).catch(e => this.log('Catch-up error', e?.message || e));
      }, 30000);
    }
  }

  stop() {
    for (const job of this.jobs) {
      try { job.stop(); } catch {}
    }
    this.log('Stopped cron jobs');
  }
}


