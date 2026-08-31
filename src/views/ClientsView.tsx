import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Users, Plus, Search, Mail, Phone, Building, Briefcase } from 'lucide-react';
import { ClientModal } from '../components/ClientModal';
import { CaseModal } from '../components/CaseModal';
import type { Client } from '../types';

export const ClientsView: React.FC = () => {
  const { clients, cases, fetchClients, fetchCases } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);

  useEffect(() => {
    fetchClients();
    fetchCases();
  }, []);

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Cartera de Clientes & Contactos
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Directorio de cuentas, organizaciones y proyectos asociados
          </p>
        </div>

        <button className="btn-primary" onClick={() => setIsClientModalOpen(true)}>
          <Plus size={16} /> Nuevo Cliente
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-card" style={{ padding: '0.85rem 1.25rem' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Buscar por cliente, empresa, correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.4rem' }}
          />
        </div>
      </div>

      {/* Clients Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {filteredClients.length === 0 ? (
          <div
            className="glass-card"
            style={{
              gridColumn: '1 / -1',
              padding: '3.5rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <Users size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>No hay clientes registrados</p>
            <button
              className="btn-primary"
              style={{ marginTop: '1rem' }}
              onClick={() => setIsClientModalOpen(true)}
            >
              <Plus size={16} /> Agregar cliente
            </button>
          </div>
        ) : (
          filteredClients.map((c) => {
            const clientCases = cases.filter((item) => item.client_id === c.id);
            const activeCases = clientCases.filter((item) => item.status !== 'closed');

            return (
              <div
                key={c.id}
                className="glass-card"
                style={{
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {c.name}
                    </h3>
                    {c.company && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.2rem' }}>
                        <Building size={13} /> {c.company}
                      </div>
                    )}
                  </div>
                  <span className={`badge ${c.status === 'active' ? 'badge-low' : 'badge-neutral'}`}>
                    {c.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {c.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Mail size={13} color="var(--text-muted)" /> {c.email}
                    </div>
                  )}
                  {c.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Phone size={13} color="var(--text-muted)" /> {c.phone}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '0.85rem',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <Briefcase size={14} color="var(--text-muted)" />
                    <span>
                      <strong style={{ color: 'var(--text-primary)' }}>{activeCases.length}</strong> caso(s) activo(s)
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                      onClick={() => setClientToEdit(c)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn-primary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                      onClick={() => {
                        setIsCaseModalOpen(true);
                      }}
                    >
                      + Caso
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ClientModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} />
      <ClientModal
        isOpen={!!clientToEdit}
        onClose={() => setClientToEdit(null)}
        clientToEdit={clientToEdit}
      />
      <CaseModal isOpen={isCaseModalOpen} onClose={() => setIsCaseModalOpen(false)} />
    </div>
  );
};
