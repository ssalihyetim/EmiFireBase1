
"use client"; // Make it a client component to use useTranslations

import type { Offer, OfferItem } from "@/types"; // Keep Attachment if used later
import React from 'react';
import { useTranslations } from "next-intl";

interface OfferPDFDocumentProps {
  offer: Offer;
}

// Minimal styles, as complex CSS might not render well in html2pdf.js
const styles = {
  page: {
    fontFamily: 'Arial, sans-serif',
    fontSize: '10px',
    padding: '20px',
    color: '#333',
    width: '100%', // Ensure it tries to use available width for A4
    boxSizing: 'border-box' as const,
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '20px',
    borderBottom: '1px solid #ccc',
    paddingBottom: '10px',
  },
  companyName: {
    fontSize: '18px',
    fontWeight: 'bold' as const,
    color: '#1A237E', 
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 'bold' as const,
    marginTop: '15px',
    marginBottom: '5px',
    color: '#1A237E',
  },
  itemDetailContainer: {
    marginTop: '2px',
  },
  itemDetail: {
    fontSize: '9px',
    marginLeft: '10px',
    color: '#555',
    display: 'block', 
    marginTop: '2px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    marginTop: '10px',
    fontSize: '9px',
  },
  th: {
    border: '1px solid #ddd',
    padding: '6px',
    textAlign: 'left' as const,
    backgroundColor: '#F5F5F5',
  },
  td: {
    border: '1px solid #ddd',
    padding: '6px',
    verticalAlign: 'top' as const,
  },
  textRight: {
    textAlign: 'right' as const,
  },
  notesSection: {
    marginTop: '15px',
    fontSize: '9px',
  },
  notesContent: {
    padding: '10px',
    border: '1px solid #eee',
    backgroundColor: '#f9f9f9',
    whiteSpace: 'pre-wrap' as const,
    minHeight: '50px',
  },
  summary: {
    marginTop: '20px',
    float: 'right' as const,
    width: '280px', // Adjusted width
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between' as const,
    padding: '3px 0',
  },
  summaryLabel: {
    fontWeight: 'bold' as const,
  },
  footer: {
    marginTop: '30px',
    paddingTop: '10px',
    borderTop: '1px solid #ccc',
    fontSize: '8px',
    textAlign: 'center' as const,
    color: '#777',
  },
  flexBetween: {
    display: 'flex',
    justifyContent: 'space-between' as const,
    marginBottom: '10px',
  },
  infoBlock: {
    width: '48%',
  }
};

export const OfferPDFDocument = React.forwardRef<HTMLDivElement, OfferPDFDocumentProps>(({ offer }, ref) => {
  const t = useTranslations('OfferPDFDocument');
  const tCommon = useTranslations('Common');

  const formatDate = (dateString: string) => {
    if (!dateString) return tCommon('na');
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return "Invalid Date";
    }
  };

  return (
    <div ref={ref} style={styles.page}>
      <div style={styles.header}>
        <div style={styles.companyName}>{t('companyName')}</div>
        <div>{t('documentTitle')}</div>
      </div>

      <div style={styles.flexBetween}>
        <div style={styles.infoBlock}>
          <div style={styles.sectionTitle}>{t('clientInformation_title')}</div>
          <div><strong>{t('label_client')}</strong> {offer.clientName}</div>
        </div>
        <div style={{...styles.infoBlock, textAlign: 'right'}}>
           <div style={styles.sectionTitle}>{t('offerDetails_title')}</div>
          <div><strong>{t('label_offerNumber')}</strong> {offer.offerNumber}</div>
          <div><strong>{t('label_date')}</strong> {formatDate(offer.createdDate)}</div>
          <div><strong>{t('label_status')}</strong> {offer.status}</div>
        </div>
      </div>


      <div style={styles.sectionTitle}>{t('offerItems_title')}</div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>{t('table_partNameAndDetails')}</th>
            <th style={{ ...styles.th, ...styles.textRight }}>{t('table_materialCost')}</th>
            <th style={{ ...styles.th, ...styles.textRight }}>{t('table_machiningCost')}</th>
            <th style={{ ...styles.th, ...styles.textRight }}>{t('table_outsourcedCost')}</th>
            <th style={{ ...styles.th, ...styles.textRight }}>{t('table_unitPrice')}</th>
            <th style={{ ...styles.th, ...styles.textRight }}>{t('table_quantity')}</th>
            <th style={{ ...styles.th, ...styles.textRight }}>{t('table_totalPrice')}</th>
          </tr>
        </thead>
        <tbody>
          {offer.items.map((item: OfferItem) => (
            <tr key={item.id}>
              <td style={styles.td}>
                {item.partName}
                <div style={styles.itemDetailContainer}>
                    {item.rawMaterialType && <div style={styles.itemDetail}>{t('item_material')} {item.rawMaterialType}</div>}
                    {item.rawMaterialDimension && <div style={styles.itemDetail}>{t('item_dimension')} {item.rawMaterialDimension}</div>}
                    {item.assignedProcesses && item.assignedProcesses.length > 0 && (
                    <div style={styles.itemDetail}>{t('item_processes')} {item.assignedProcesses.join(', ')}</div>
                    )}
                    {item.attachments && item.attachments.length > 0 && (
                    <div style={styles.itemDetail}>{t('item_attachments')} {item.attachments.map(att => att.name).join(', ')}</div>
                    )}
                </div>
              </td>
              <td style={{ ...styles.td, ...styles.textRight }}>{(item.materialCost || 0).toFixed(2)} {offer.currency}</td>
              <td style={{ ...styles.td, ...styles.textRight }}>{(item.machiningCost || 0).toFixed(2)} {offer.currency}</td>
              <td style={{ ...styles.td, ...styles.textRight }}>{(item.outsourcedProcessesCost || 0).toFixed(2)} {offer.currency}</td>
              <td style={{ ...styles.td, ...styles.textRight }}>{(item.unitPrice || 0).toFixed(2)} {offer.currency}</td>
              <td style={{ ...styles.td, ...styles.textRight }}>{item.quantity}</td>
              <td style={{ ...styles.td, ...styles.textRight }}>{(item.totalPrice || 0).toFixed(2)} {offer.currency}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={styles.summary}>
        <div style={styles.summaryRow}>
          <span style={styles.summaryLabel}>{t('summary_subtotal')}</span>
          <span>{offer.subtotal.toFixed(2)} {offer.currency}</span>
        </div>
        <div style={styles.summaryRow}>
          <span style={styles.summaryLabel}>{t('summary_vat', {vatRate: offer.vatRate})}</span>
          <span>{offer.vatAmount.toFixed(2)} {offer.currency}</span>
        </div>
        <div style={styles.summaryRow}>
          <span style={styles.summaryLabel}>{t('summary_grandTotal')}</span>
          <span>{offer.grandTotal.toFixed(2)} {offer.currency}</span>
        </div>
      </div>

      <div style={{clear: 'both'}}></div>

      {offer.notes && (
        <div style={styles.notesSection}>
          <div style={styles.sectionTitle}>{t('notes_title')}</div>
          <div style={styles.notesContent}>{offer.notes}</div>
        </div>
      )}

      <div style={styles.footer}>
        {t('footer_thankYou')}
      </div>
    </div>
  );
});

OfferPDFDocument.displayName = "OfferPDFDocument";

    