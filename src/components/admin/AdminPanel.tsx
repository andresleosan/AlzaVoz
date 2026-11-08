"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Lock,
  Search,
  Filter,
  LogOut,
  RefreshCw,
  FolderOpen,
  MessageSquare,
  AlertCircle,
  Eye,
} from 'lucide-react';
import {
  ADMIN_REPORT_STATUSES,
  type AdminReportSummary,
  type AdminReportDetail,
  type AdminFilterOptions,
} from '../../lib/admin/contracts';
import { REPORT_CATEGORIES, REPORT_COMMUNES, REPORT_RISK_LEVELS } from '../../lib/report/contracts';
import { AdminReportDetailView } from './AdminReportDetail';
import styles from './admin.module.css';

interface AdminPanelProps {
  initialToken?: string;
}

interface NoticeSummary {
  id: string;
  kind: string;
  title: string;
  description: string;
  commune: number;
  event_date: string;
  contact: string;
  created_at: string;
  tipCount: number;
}

interface NoticeTip {
  request_id: string;
  notice_id: string;
  text: string;
  contact: string;
  created_at: string;
}

export function AdminPanel({ initialToken }: AdminPanelProps) {
  const [token, setToken] = useState<string>(() => {
    if (initialToken) return initialToken;
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('alzavoz_admin_token') || '';
    }
    return '';
  });
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('alzavoz_admin_email') || null;
    }
    return null;
  });

  // View state
  const [activeTab, setActiveTab] = useState<'reports' | 'notices'>('reports');
  const [selectedReport, setSelectedReport] = useState<AdminReportDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Reports data state
  const [reports, setReports] = useState<AdminReportSummary[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<AdminFilterOptions>({
    commune: 'todas',
    riskLevel: 'todos',
    category: 'todas',
    status: 'todos',
    search: '',
  });

  // Notices data state
  const [notices, setNotices] = useState<NoticeSummary[]>([]);
  const [isLoadingNotices, setIsLoadingNotices] = useState(false);
  const [selectedNoticeTips, setSelectedNoticeTips] = useState<{ noticeId: string; tips: NoticeTip[] } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleLogout = useCallback(() => {
    setToken('');
    setUserEmail(null);
    setSelectedReport(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('alzavoz_admin_token');
      sessionStorage.removeItem('alzavoz_admin_email');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError(null);

    // If direct token was provided
    const directToken = tokenInput.trim();
    if (directToken) {
      // Validate by attempting to fetch reports
      try {
        const res = await fetch('/api/admin/reports', {
          headers: { Authorization: `Bearer ${directToken}` },
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Token no válido o expirado.' }));
          throw new Error(errData.error || 'Token no válido.');
        }
        setToken(directToken);
        setUserEmail('defensor@alzavoz.medellin.gov.co');
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('alzavoz_admin_token', directToken);
          sessionStorage.setItem('alzavoz_admin_email', 'defensor@alzavoz.medellin.gov.co');
        }
        return;
      } catch (err: unknown) {
        setAuthError(err instanceof Error ? err.message : 'Error al verificar credenciales.');
        return;
      } finally {
        setIsLoggingIn(false);
      }
    }

    // Email/Password login simulation or Firebase Auth fallback
    if (!emailInput || !passwordInput) {
      setAuthError('Por favor ingresa tu correo institucional y contraseña.');
      setIsLoggingIn(false);
      return;
    }

    // In local dev/testing without Firebase keys, validate standard team credentials
    setAuthError('Para ingresar, introduce un token de sesión de Firebase válido o de prueba.');
    setIsLoggingIn(false);
  };

  useEffect(() => {
    if (!token) return;
    let active = true;

    if (activeTab === 'reports') {
      const query = new URLSearchParams();
      if (filters.commune && filters.commune !== 'todas') query.set('commune', filters.commune);
      if (filters.riskLevel && filters.riskLevel !== 'todos') query.set('riskLevel', filters.riskLevel);
      if (filters.category && filters.category !== 'todas') query.set('category', filters.category);
      if (filters.status && filters.status !== 'todos') query.set('status', filters.status);
      if (filters.search && filters.search.trim()) query.set('search', filters.search.trim());

      void fetch(`/api/admin/reports?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (!res.ok) {
            if (res.status === 401) {
              handleLogout();
              throw new Error('Sesión expirada o no autorizada. Por favor ingresa de nuevo.');
            }
            const errData = (await res.json().catch(() => ({ error: 'Error al cargar expedientes.' }))) as { error?: string };
            throw new Error(errData.error || 'Error de servidor.');
          }
          return res.json() as Promise<{ reports: AdminReportSummary[]; total: number }>;
        })
        .then((data) => {
          if (!active) return;
          setReports(data.reports || []);
          setTotalReports(data.total || 0);
        })
        .catch((err: unknown) => {
          if (!active) return;
          setReportsError(err instanceof Error ? err.message : 'Error de comunicación.');
        })
        .finally(() => {
          if (active) setIsLoadingReports(false);
        });
    } else {
      void fetch('/api/admin/notices', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : { notices: [] }))
        .then((data: { notices?: NoticeSummary[] }) => {
          if (!active) return;
          setNotices(data.notices || []);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setIsLoadingNotices(false);
        });
    }

    return () => {
      active = false;
    };
  }, [token, activeTab, filters, refreshTrigger, handleLogout]);

  // View full report detail
  const handleOpenReport = async (code: string) => {
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/reports/${code}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('No se pudo cargar el expediente.');
      const data = (await res.json()) as { report: AdminReportDetail };
      setSelectedReport(data.report);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al abrir expediente.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // View tips for a notice
  const handleViewNoticeTips = async (noticeId: string) => {
    try {
      const res = await fetch(`/api/admin/notices/${noticeId}/tips`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { tips: NoticeTip[] };
        setSelectedNoticeTips({ noticeId, tips: data.tips || [] });
      }
    } catch {
      alert('Error al consultar pistas.');
    }
  };

  // Render Login Card if unauthenticated
  if (!token) {
    return (
      <main className={styles.adminContainer} style={{ padding: '24px 16px' }}>
        <div className={styles.loginCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: 10, borderRadius: 12 }}>
              <Lock size={26} color="#EF4444" aria-hidden="true" />
            </div>
            <div>
              <h2>Panel de Gestión Autorizado</h2>
              <span className={styles.teamBadge}>Equipo Legal y de Acompañamiento</span>
            </div>
          </div>

          <p>
            Acceso restringido para el equipo del Concejal y defensores de derechos de AlzaVoz.
            Autenticación protegida con Firebase Auth y tokens criptográficos.
          </p>

          {authError && (
            <div role="alert" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#FCA5A5', padding: 12, borderRadius: 8, marginBottom: 18, fontSize: '0.9rem' }}>
              <AlertCircle size={16} style={{ display: 'inline', marginRight: 6 }} />
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className={styles.formGroup}>
              <label htmlFor="admin-token-input">Token de Sesión Firebase (o Test Token)</label>
              <textarea
                id="admin-token-input"
                rows={3}
                placeholder="Pega aquí el ID Token JWT de Firebase..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className={styles.formInput}
                style={{ minHeight: 80, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ textAlign: 'center', margin: '14px 0', color: '#6B7280', fontSize: '0.85rem' }}>
              — O ingresa con credenciales institucionales —
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="admin-email">Correo Institucional</label>
              <input
                id="admin-email"
                type="email"
                placeholder="nombre@alzavoz.medellin.gov.co"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup} style={{ marginBottom: 24 }}>
              <label htmlFor="admin-password">Contraseña</label>
              <input
                id="admin-password"
                type="password"
                placeholder="••••••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className={styles.formInput}
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className={styles.btnPrimary}
            >
              <Lock size={18} aria-hidden="true" />
              <span>{isLoggingIn ? 'Verificando...' : 'Acceder al Panel Privado'}</span>
            </button>
          </form>
        </div>
      </main>
    );
  }

  // If viewing a single report detail
  if (selectedReport) {
    return (
      <main className={styles.adminContainer} style={{ padding: '24px 16px' }}>
        <AdminReportDetailView
          report={selectedReport}
          token={token}
          onBack={() => setSelectedReport(null)}
          onStatusUpdated={(updated) => {
            setSelectedReport(updated);
            setReports((prev) =>
              prev.map((r) =>
                r.code === updated.code
                  ? { ...r, status: updated.status, adminNotes: updated.adminNotes, updatedAt: updated.updatedAt }
                  : r
              )
            );
          }}
        />
      </main>
    );
  }

  // Calculate metrics
  const countRadicados = reports.filter((r) => r.status === 'radicado').length;
  const countRevision = reports.filter((r) => r.status === 'en_revision').length;
  const countTramite = reports.filter((r) => r.status === 'en_tramite').length;
  const countOficio = reports.filter((r) => r.status === 'oficio_tramitado').length;

  return (
    <main className={styles.adminContainer} style={{ padding: '24px 16px' }}>
      {/* Header */}
      <header className={styles.adminHeader}>
        <div className={styles.adminHeaderTitle}>
          <ShieldAlert size={28} color="#EF4444" aria-hidden="true" />
          <div>
            <h1>Panel de Gestión y Acompañamiento</h1>
            <div className={styles.adminUserBadge}>
              <span className={styles.teamBadge}>Equipo Autorizado</span>
              <span>{userEmail || 'defensor@alzavoz.medellin.gov.co'}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            className={styles.btnSmall}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            aria-label="Actualizar listado de expedientes"
          >
            <RefreshCw size={15} aria-hidden="true" />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className={styles.btnSmall}
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderColor: '#EF4444', color: '#FCA5A5' }}
            aria-label="Cerrar sesión del panel"
          >
            <LogOut size={15} aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className={styles.tabsBar} aria-label="Secciones del panel">
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`${styles.tabBtn} ${activeTab === 'reports' ? styles.tabBtnActive : ''}`}
        >
          <FolderOpen size={18} style={{ display: 'inline', marginRight: 6 }} />
          Expedientes de Denuncia ({totalReports})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notices')}
          className={`${styles.tabBtn} ${activeTab === 'notices' ? styles.tabBtnActive : ''}`}
        >
          <MessageSquare size={18} style={{ display: 'inline', marginRight: 6 }} />
          Avisos Comunitarios y Pistas ({notices.length})
        </button>
      </nav>

      {activeTab === 'reports' ? (
        <>
          {/* Metrics Grid */}
          <section className={styles.metricsGrid} aria-label="Métricas de casos">
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Total Expedientes</span>
              <span className={styles.metricValue}>{totalReports}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Radicados Nuevos</span>
              <span className={styles.metricValue} style={{ color: '#60A5FA' }}>
                {countRadicados}
              </span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>En Revisión Legal</span>
              <span className={styles.metricValue} style={{ color: '#FCD34D' }}>
                {countRevision}
              </span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>En Trámite</span>
              <span className={styles.metricValue} style={{ color: '#F59E0B' }}>
                {countTramite}
              </span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Oficios Tramitados</span>
              <span className={styles.metricValue} style={{ color: '#6EE7B7' }}>
                {countOficio}
              </span>
            </div>
          </section>

          {/* Filters */}
          <section className={styles.filtersSection} aria-labelledby="filters-title">
            <h2 id="filters-title" className={styles.filtersTitle}>
              <Filter size={18} color="#EF4444" aria-hidden="true" />
              <span>Filtros de Búsqueda y Gestión</span>
            </h2>

            <div className={styles.filtersGrid}>
              <div className={styles.filterField}>
                <label htmlFor="filter-commune">Comuna / Corregimiento</label>
                <select
                  id="filter-commune"
                  value={filters.commune}
                  onChange={(e) => setFilters({ ...filters, commune: e.target.value })}
                >
                  <option value="todas">Todas las comunas</option>
                  {REPORT_COMMUNES.map((com) => (
                    <option key={com} value={com}>
                      {com}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterField}>
                <label htmlFor="filter-risk">Nivel de Riesgo</label>
                <select
                  id="filter-risk"
                  value={filters.riskLevel}
                  onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
                >
                  <option value="todos">Todos los niveles</option>
                  {REPORT_RISK_LEVELS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterField}>
                <label htmlFor="filter-category">Categoría</label>
                <select
                  id="filter-category"
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                >
                  <option value="todas">Todas las categorías</option>
                  {REPORT_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterField}>
                <label htmlFor="filter-status">Estado</label>
                <select
                  id="filter-status"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="todos">Todos los estados</option>
                  {ADMIN_REPORT_STATUSES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterField} style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="filter-search">Buscar por Código, Resumen o Barrio</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="filter-search"
                    type="search"
                    placeholder="Ej. ALZ-2026, Poblado, fotomulta, retén..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    style={{ width: '100%', paddingLeft: 38 }}
                  />
                  <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: 16 }} />
                </div>
              </div>
            </div>
          </section>

          {/* Reports Table */}
          {reportsError && (
            <div role="alert" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', color: '#FCA5A5', padding: 14, borderRadius: 10, marginBottom: 20 }}>
              <AlertCircle size={18} style={{ display: 'inline', marginRight: 8 }} />
              {reportsError}
            </div>
          )}

          {isLoadingReports ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <p>Cargando expedientes desde Cloudflare D1...</p>
            </div>
          ) : reports.length === 0 ? (
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 14, padding: 40, textAlign: 'center' }}>
              <FolderOpen size={36} color="#6B7280" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>No se encontraron expedientes con los filtros seleccionados</h3>
              <p style={{ color: '#9CA3AF', fontSize: '0.9rem', marginTop: 8 }}>
                Prueba ajustando los filtros de comuna, estado o término de búsqueda.
              </p>
            </div>
          ) : (
            <section className={styles.tableWrap} aria-label="Tabla de expedientes">
              <table className={styles.reportsTable}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Fecha</th>
                    <th>Comuna</th>
                    <th>Riesgo</th>
                    <th>Estado</th>
                    <th>Evidencias</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((rep) => (
                    <tr key={rep.code}>
                      <td className={styles.codeCell}>{rep.code}</td>
                      <td>{new Date(rep.createdAt).toLocaleDateString('es-CO')}</td>
                      <td className="data-sensitive">{rep.commune}</td>
                      <td>
                        <span
                          className={
                            rep.riskLevel === 'alto'
                              ? styles.badgeRiskAlto
                              : rep.riskLevel === 'medio'
                              ? styles.badgeRiskMedio
                              : styles.badgeRiskBajo
                          }
                        >
                          {rep.riskLevel}
                        </span>
                      </td>
                      <td>
                        <span className={styles.badgeStatus}>
                          {ADMIN_REPORT_STATUSES.find((s) => s.id === rep.status)?.label || rep.status}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: '#D1D5DB' }}>
                          {rep.attachmentCount} adjunto(s)
                          {rep.recordingSessionId ? ' · Video ☁️' : ''}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleOpenReport(rep.code)}
                          disabled={isLoadingDetail}
                          className={styles.btnSmall}
                          style={{ minHeight: 44, display: 'flex', alignItems: 'center', gap: 6 }}
                          aria-label={`Ver detalles del expediente ${rep.code}`}
                        >
                          <Eye size={15} aria-hidden="true" />
                          <span>Ver caso</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      ) : (
        /* Notices and Tips Tab */
        <section aria-labelledby="notices-heading">
          <h2 id="notices-heading" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>
            Avisos Comunitarios de Búsqueda y Pistas Anónimas
          </h2>

          {isLoadingNotices ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <p>Consultando avisos...</p>
            </div>
          ) : notices.length === 0 ? (
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 14, padding: 32, textAlign: 'center' }}>
              <p style={{ color: '#9CA3AF' }}>No hay avisos comunitarios registrados en el sistema.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {notices.map((not) => (
                <div
                  key={not.id}
                  style={{
                    background: '#111827',
                    border: '1px solid #1F2937',
                    borderRadius: 12,
                    padding: 18,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div style={{ maxWidth: '80%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span className={styles.badgeStatus}>{not.kind}</span>
                      <strong style={{ fontSize: '1.05rem', color: '#F9FAFB' }}>{not.title}</strong>
                      <span style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>
                        Comuna {not.commune} · {not.event_date}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: '#D1D5DB', fontSize: '0.9rem' }}>{not.description}</p>
                    {not.contact && (
                      <p style={{ margin: '6px 0 0', color: '#9CA3AF', fontSize: '0.82rem' }}>
                        Contacto del autor: <code className="data-sensitive">{not.contact}</code>
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleViewNoticeTips(not.id)}
                    className={styles.btnSecondary}
                    style={{ minHeight: 48, padding: '8px 16px', fontSize: '0.88rem' }}
                  >
                    <MessageSquare size={16} aria-hidden="true" />
                    <span>Ver {not.tipCount} Pista(s)</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Modal / Dialog for viewing tips */}
          {selectedNoticeTips && (
            <div
              style={{
                marginTop: 24,
                background: '#0B0F19',
                border: '1px solid #374151',
                borderRadius: 14,
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                  Pistas Anónimas para el Aviso ({selectedNoticeTips.tips.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedNoticeTips(null)}
                  className={styles.btnSmall}
                >
                  Cerrar
                </button>
              </div>

              {selectedNoticeTips.tips.length === 0 ? (
                <p style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>Aún no se han recibido pistas para este aviso.</p>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {selectedNoticeTips.tips.map((t) => (
                    <div
                      key={t.request_id}
                      style={{
                        background: '#111827',
                        border: '1px solid #1F2937',
                        borderRadius: 10,
                        padding: 14,
                      }}
                    >
                      <p style={{ margin: '0 0 8px', color: '#F9FAFB', fontSize: '0.92rem' }}>{t.text}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#9CA3AF' }}>
                        <span>Contacto: <code className="data-sensitive">{t.contact || 'Anónimo'}</code></span>
                        <span>{new Date(t.created_at).toLocaleString('es-CO')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
