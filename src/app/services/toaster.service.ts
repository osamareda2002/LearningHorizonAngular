import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ToasterService {
  showToast(message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 5000) {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    
    const icon = type === 'success' 
      ? 'bi-check-circle-fill' 
      : type === 'error' 
      ? 'bi-exclamation-circle-fill' 
      : 'bi-info-circle-fill';
    
    toast.innerHTML = `
      <i class="bi ${icon}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);

    // Auto remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  showSuccess(message: string, duration: number = 5000) {
    this.showToast(message, 'success', duration);
  }

  showError(message: string, duration: number = 5000) {
    this.showToast(message, 'error', duration);
  }

  showInfo(message: string, duration: number = 5000) {
    this.showToast(message, 'info', duration);
  }
}

