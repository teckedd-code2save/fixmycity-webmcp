'use client';

import { SyntheticEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  Camera,
  CheckCircle2,
  MapPin,
  Radio,
  Send,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LocationPicker } from '@/components/location-picker';
import { ActorNavigation } from '@/components/actor-navigation';

type Report = {
  id: string;
  title: string;
  address: string;
  status: string;
  severity: string;
  confirmations: number;
};

export function ResidentPortal() {
  const [reports, setReports] = useState<Report[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [point, setPoint] = useState({ latitude: 5.5671, longitude: -0.1902 });
  useEffect(() => {
    void fetch('/api/reports')
      .then(async (r) => (await r.json()) as { reports: Report[] })
      .then((data) => setReports(data.reports?.slice(0, 4) ?? []));
  }, []);
  async function submit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    setSubmitting(true);
    setSuccess(null);
    const form = new FormData(event.currentTarget);
    let imageKey: string | undefined;
    const file = form.get('photo');
    if (file instanceof File && file.size) {
      const upload = new FormData();
      upload.set('file', file);
      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: upload,
      });
      const result = (await response.json()) as { error?: string; key: string };
      if (!response.ok) {
        setSubmitting(false);
        alert(result.error);
        return;
      }
      imageKey = result.key;
    }
    const payload = {
      title: form.get('title'),
      description: form.get('description'),
      category: form.get('category'),
      severity: form.get('severity'),
      address: form.get('address'),
      landmark: form.get('landmark'),
      affectedPeople: Number(form.get('affectedPeople') ?? 1),
      ...point,
      imageKey,
    };
    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as {
      error?: string;
      report: { id: string };
    };
    setSubmitting(false);
    if (!response.ok) {
      alert(result.error);
      return;
    }
    setSuccess(result.report.id);
    event.currentTarget.reset();
    const updated = await fetch('/api/reports').then(
      async (r) => (await r.json()) as { reports: Report[] },
    );
    setReports(updated.reports?.slice(0, 4) ?? []);
  }
  async function confirm(id: string) {
    await fetch(`/api/reports/${id}/confirm`, { method: 'POST' });
    const updated = await fetch('/api/reports').then(
      async (r) => (await r.json()) as { reports: Report[] },
    );
    setReports(updated.reports?.slice(0, 4) ?? []);
  }
  return (
    <main className="portal-page">
      <header className="portal-header">
        <Link href="/" className="portal-brand">
          <span>
            <MapPin />
          </span>
          <strong>FixMyCity</strong>
        </Link>
        <ActorNavigation active="resident" />
      </header>
      <section className="resident-hero">
        <div>
          <div className="eyebrow">
            <Radio /> Resident reporting
          </div>
          <h1>
            Spot it. Pin it.
            <br />
            <em>Help fix it.</em>
          </h1>
          <p>
            Report a local problem in under two minutes. Your evidence joins
            nearby signals so city teams can respond with context.
          </p>
        </div>
        <div className="agent-ready-card">
          <Bot />
          <div>
            <span>
              <Sparkles /> Agent-ready
            </span>
            <strong>Tell your browser agent what happened</strong>
            <p>
              “Report the uncollected waste near me. About 1,000 people are
              affected.”
            </p>
            <small>
              It can locate, structure and submit with your approval.
            </small>
          </div>
        </div>
      </section>
      <div className="resident-layout">
        <form className="report-form" onSubmit={submit}>
          <div className="form-heading">
            <span>01</span>
            <div>
              <h2>What happened?</h2>
              <p>
                Share observable facts. Avoid personal or sensitive information.
              </p>
            </div>
          </div>
          <label htmlFor="report-title">
            Short title
            <Input
              id="report-title"
              name="title"
              required
              minLength={4}
              placeholder="e.g. Blocked drain flooding the pavement"
            />
          </label>
          <div className="field-pair">
            <label htmlFor="report-category">
              Category
              <select
                id="report-category"
                name="category"
                required
                defaultValue="drainage"
              >
                <option value="drainage">Blocked drainage</option>
                <option value="flooding">Flooding</option>
                <option value="road">Road damage</option>
                <option value="lighting">Street lighting</option>
                <option value="waste">Waste</option>
              </select>
            </label>
            <label htmlFor="report-severity">
              Urgency
              <select
                id="report-severity"
                name="severity"
                required
                defaultValue="high"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical danger</option>
              </select>
            </label>
          </div>
          <label htmlFor="report-description">
            What can you observe?
            <Textarea
              id="report-description"
              name="description"
              required
              minLength={10}
              rows={4}
              placeholder="Describe what you can see, who is affected, and any immediate hazard."
            />
          </label>
          <div className="form-heading compact">
            <span>02</span>
            <div>
              <h2>Where is it?</h2>
              <p>
                Use your current location, then adjust the real map pin if
                needed.
              </p>
            </div>
          </div>
          <LocationPicker value={point} onChange={setPoint} />
          <div className="field-pair">
            <label htmlFor="report-address">
              Street or area
              <Input
                id="report-address"
                name="address"
                required
                placeholder="Nii Nortei Nyanchi Street"
              />
            </label>
            <label htmlFor="report-landmark">
              Nearby landmark
              <Input
                id="report-landmark"
                name="landmark"
                placeholder="School, clinic or junction"
              />
            </label>
          </div>
          <div className="field-pair">
            <label htmlFor="affected-people">
              People affected
              <Input
                id="affected-people"
                name="affectedPeople"
                type="number"
                min="1"
                defaultValue="1"
              />
            </label>
            <label htmlFor="report-photo" className="photo-label">
              Photo evidence
              <span>
                <Camera /> Add JPEG, PNG or WebP
                <input
                  id="report-photo"
                  name="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                />
              </span>
            </label>
          </div>
          {success && (
            <div className="success-banner">
              <CheckCircle2 />
              <div>
                <strong>Report {success} received</strong>
                <span>
                  It is now visible to city operations and WebMCP agents.
                </span>
              </div>
            </div>
          )}
          <Button type="submit" disabled={submitting} className="submit-report">
            {submitting ? (
              'Submitting evidence…'
            ) : (
              <>
                Submit civic report <Send />
              </>
            )}
          </Button>
        </form>
        <aside className="nearby-panel">
          <div className="section-title-row">
            <div>
              <h2>Nearby signals</h2>
              <p>Confirm an existing report instead of duplicating it</p>
            </div>
          </div>
          {reports.map((report) => (
            <article key={report.id} className="nearby-card">
              <div>
                <span className={`severity-dot ${report.severity}`} />
                <strong>{report.title}</strong>
              </div>
              <p>{report.address}</p>
              <footer>
                <span>
                  {report.confirmations} confirmations · {report.status}
                </span>
                <button onClick={() => confirm(report.id)}>
                  I see this too
                </button>
              </footer>
            </article>
          ))}
        </aside>
      </div>
    </main>
  );
}
