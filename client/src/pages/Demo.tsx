import React from 'react';
import { Link } from 'react-router-dom';

const scenarioCards = [
  {
    kicker: 'Urgent need',
    title: 'Kibera South Health Centre',
    detail: 'Immediate wound-care supply shortfall flagged for coordinator review.',
    stat: 'Priority need',
    tone: 'alert',
  },
  {
    kicker: 'Available supply',
    title: 'Kenyatta National Hospital',
    detail: 'Unopened nitrile gloves and dressing inventory available for redistribution.',
    stat: '800 units',
    tone: 'supply',
  },
  {
    kicker: 'Ranked matches',
    title: 'Geospatial priority queue',
    detail: 'Distance, urgency, facility trust, recency, category fit, and quantity signals are combined.',
    stat: '92 score',
    tone: 'trust',
  },
  {
    kicker: 'AI brief',
    title: 'Coordinator-ready summary',
    detail: 'AI-assisted prototype brief explains why the route deserves human verification.',
    stat: 'Verify first',
    tone: '',
  },
];

export default function Demo() {
  return (
    <div className="demo-showcase">
      <section className="demo-scenario-hero fade-in-up">
        <div>
          <span className="lesnar-badge">Demo Scenario</span>
          <h1 className="heading">Public-health redistribution workflow</h1>
          <p>
            A synthetic Nairobi County scenario showing how MediMatch ranks urgent needs against available surplus,
            explains the match, and moves the coordinator toward verification.
          </p>
          <div className="hero-disclosure">AI-assisted prototype. Synthetic demo data. No patient records. Verify before coordination.</div>
        </div>
        <div className="scenario-route-card" aria-hidden="true">
          <div className="scenario-node supply">Supply</div>
          <div className="scenario-line" />
          <div className="scenario-node need">Need</div>
          <div className="priority-score scenario-score">Priority score 92</div>
        </div>
      </section>

      <section className="demo-card-grid">
        {scenarioCards.map(card => (
          <article key={card.kicker} className={`metric-card ${card.tone}`}>
            <span>{card.kicker}</span>
            <strong>{card.stat}</strong>
            <small><b>{card.title}</b><br />{card.detail}</small>
          </article>
        ))}
      </section>

      <section className="command-strip demo-action-strip">
        <div>
          <strong>Move through the command workflow</strong>
          <div className="muted-small">Map the route, inspect matches, post a supply or need signal, then review as a coordinator.</div>
        </div>
        <div className="demo-actions">
          <Link to="/dashboard?demoTab=map" className="btn btn-primary">Map</Link>
          <Link to="/dashboard?demoTab=suggested&ai_explain_demo=true" className="btn btn-outline">Matches</Link>
          <Link to="/dashboard?demoTab=create" className="btn btn-outline">Post Supply/Need</Link>
          <Link to="/admin" className="btn btn-outline">Coordinator Review</Link>
        </div>
      </section>
    </div>
  );
}
