(function () {
      const caseContentCache = new Map();
      const root = document.documentElement;
      const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
      let activeModal = null;

      const setProgress = (value) => {
        root.style.setProperty('--modal-progress', clamp(value, 0, 1));
      };
      setProgress(0);

      const fetchCaseContent = (src) => {
        if (!src) {
          return Promise.resolve('');
        }

        const cached = caseContentCache.get(src);
        if (typeof cached === 'string') {
          return Promise.resolve(cached);
        }

        if (cached && typeof cached.then === 'function') {
          return cached;
        }

        const loadFromNetwork = () =>
          fetch(src, { credentials: 'same-origin' }).then((response) => {
            if (!response.ok) {
              throw new Error(`Failed to load ${src}`);
            }
            return response.text();
          });

        const loadFromFallback = () => {
          if (window.__CASE_FALLBACKS && typeof window.__CASE_FALLBACKS[src] === 'string') {
            return Promise.resolve(window.__CASE_FALLBACKS[src]);
          }
          return Promise.reject(new Error(`No local fallback for ${src}`));
        };

        const request = (window.fetch ? loadFromNetwork() : Promise.reject(new Error('Fetch not supported')))
          .catch((error) => {
            if (window.location.protocol === 'file:' || !window.fetch) {
              return loadFromFallback();
            }
            const fallbackPromise = loadFromFallback().catch(() => {
              throw error;
            });
            return fallbackPromise;
          })
          .then((html) => {
            caseContentCache.set(src, html);
            return html;
          })
          .catch((error) => {
            caseContentCache.delete(src);
            throw error;
          });

        caseContentCache.set(src, request);
        return request;
      };

      const replaceFeatherIcons = (scope) => {
        if (window.feather && typeof window.feather.replace === 'function') {
          window.feather.replace(scope instanceof Element ? scope : undefined);
        }
      };

      const createModalController = ({ modalId, triggerSelector, contentSelector }) => {
        const modal = document.getElementById(modalId);
        if (!modal) {
          return null;
        }

        const sheet = modal.querySelector('.experience-modal__sheet');
        if (!sheet) {
          return null;
        }

        const header = modal.querySelector('.experience-modal__header');
        const dragZone = modal.querySelector('[data-modal-drag-zone]');
        const dismissControls = modal.querySelectorAll('[data-modal-dismiss]');
        const contentTarget = contentSelector ? modal.querySelector(contentSelector) : null;
        let lastFocusedElement = null;
        let isDragging = false;
        let dragStartY = 0;
        let lastDragDelta = 0;
        let sheetHeight = 0;
        let dragPointerId = null;
        let api;

        const updateHeaderState = () => {
          const shouldRaise = sheet.scrollTop > 8;
          if (header) {
            header.classList.toggle('is-raised', shouldRaise);
          }
          sheet.classList.toggle('is-condensed', shouldRaise);
        };

        const loadModalContent = () => {
          if (!contentTarget || contentTarget.hasAttribute('data-case-loaded')) {
            return;
          }

          const src = contentTarget.getAttribute('data-case-src');
          if (!src) {
            return;
          }

          contentTarget.innerHTML = '<p class="experience-modal__role-copy">Loading case study...</p>';

          fetchCaseContent(src)
            .then((html) => {
              contentTarget.innerHTML = html;
              contentTarget.setAttribute('data-case-loaded', 'true');
              replaceFeatherIcons(contentTarget);
            })
            .catch(() => {
              contentTarget.innerHTML = '<p class="experience-modal__role-copy">Unable to load case study. Please try again.</p>';
            });
        };

        const finishClose = (restoreFocus = true) => {
          modal.classList.remove('is-visible');
          modal.setAttribute('aria-hidden', 'true');
          document.body.style.overflow = '';
          if (restoreFocus && lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
            lastFocusedElement.focus();
          }
          lastFocusedElement = null;
          sheet.scrollTop = 0;
          updateHeaderState();
          if (activeModal === api) {
            activeModal = null;
          }
        };

        const closeModal = () => {
          if (!modal.classList.contains('is-open')) {
            return;
          }
          modal.classList.remove('is-open');
          modal.classList.remove('is-dragging');
          setProgress(0);
          updateHeaderState();
        };

        const forceClose = ({ restoreFocus } = { restoreFocus: false }) => {
          if (!modal.classList.contains('is-open') && !modal.classList.contains('is-visible')) {
            return;
          }
          modal.classList.remove('is-open');
          modal.classList.remove('is-dragging');
          modal.classList.remove('is-visible');
          modal.setAttribute('aria-hidden', 'true');
          document.body.style.overflow = '';
          setProgress(0);
          sheet.scrollTop = 0;
          updateHeaderState();
          if (restoreFocus && lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
            lastFocusedElement.focus();
          }
          lastFocusedElement = null;
          if (activeModal === api) {
            activeModal = null;
          }
        };

        const openModal = (event) => {
          const triggerElement = event && event.currentTarget instanceof Element ? event.currentTarget : null;
          if (event) {
            if (event.type === 'click') {
              if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (typeof event.button === 'number' && event.button !== 0)) {
                return;
              }
              event.preventDefault();
            } else if (event.type === 'keydown') {
              event.preventDefault();
            }
          }

          if (contentTarget) {
            loadModalContent();
          }

          if (modal.classList.contains('is-open')) {
            return;
          }

          if (triggerElement && event && event.type === 'click') {
            const rect = triggerElement.getBoundingClientRect();
            const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
            const offset = rect.bottom - viewportHeight + 24;
            if (offset > 0) {
              window.scrollBy(0, offset);
            }
          }

          if (activeModal && activeModal !== api) {
            activeModal.forceClose({ restoreFocus: false });
          }

          lastFocusedElement = document.activeElement;
          activeModal = api;
          modal.classList.add('is-visible');
          modal.removeAttribute('aria-hidden');
          document.body.style.overflow = 'hidden';
          setProgress(0);
          sheet.scrollTop = 0;
          updateHeaderState();
          requestAnimationFrame(() => {
            modal.classList.add('is-open');
            setProgress(1);
            sheet.focus();
          });
        };

        const stopDrag = (shouldClose) => {
          if (!isDragging) {
            return;
          }

          if (dragZone && dragPointerId !== null && dragZone.releasePointerCapture) {
            dragZone.releasePointerCapture(dragPointerId);
          }

          const progress = 1 - clamp(lastDragDelta / (sheetHeight || 1), 0, 1);
          isDragging = false;
          dragPointerId = null;
          modal.classList.remove('is-dragging');

          if (shouldClose === true || progress < 0.7 || lastDragDelta > 120) {
            closeModal();
          } else {
            setProgress(1);
            modal.classList.add('is-open');
          }
        };

        const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

        const handleDragStart = (event) => {
          if (!dragZone || !modal.classList.contains('is-open') || !isCoarsePointer) {
            return;
          }

          if (event.target.closest('[data-modal-dismiss]')) {
            return;
          }

          isDragging = true;
          dragPointerId = event.pointerId;
          dragStartY = event.clientY;
          lastDragDelta = 0;
          sheetHeight = sheet.getBoundingClientRect().height;
          modal.classList.add('is-dragging');

          if (dragZone.setPointerCapture && typeof dragZone.setPointerCapture === 'function') {
            try {
              dragZone.setPointerCapture(dragPointerId);
            } catch (error) {
              dragPointerId = null;
            }
          }
        };

        const handleDragMove = (event) => {
          if (!isDragging || (dragPointerId !== null && event.pointerId !== dragPointerId)) {
            return;
          }

          const deltaY = Math.max(event.clientY - dragStartY, 0);
          lastDragDelta = deltaY;
          const progress = 1 - clamp(deltaY / (sheetHeight || 1), 0, 1);
          setProgress(progress);
        };

        const handleDragEnd = (event) => {
          if (!isDragging) {
            return;
          }

          if (dragPointerId !== null && event && event.pointerId !== dragPointerId) {
            return;
          }

          stopDrag();
        };

        const handleTransitionEnd = (event) => {
          if (event.target !== sheet || event.propertyName !== 'transform') {
            return;
          }

          if (!modal.classList.contains('is-open')) {
            finishClose();
          }
        };

        const triggers = Array.from(document.querySelectorAll(triggerSelector));

        triggers.forEach((trigger) => {
          trigger.addEventListener('click', openModal);
          trigger.addEventListener('keydown', (event) => {
            const isActivationKey = event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar';
            if (isActivationKey) {
              openModal(event);
            }
          });
        });

        dismissControls.forEach((control) => {
          control.addEventListener('click', closeModal);
        });

        sheet.addEventListener('transitionend', handleTransitionEnd);
        sheet.addEventListener('scroll', updateHeaderState);

        modal.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') {
            closeModal();
          }
        });

        modal.addEventListener('pointerdown', (event) => {
          if (event.target === modal) {
            closeModal();
          }
        });

        if (dragZone && isCoarsePointer) {
          dragZone.addEventListener('pointerdown', handleDragStart);
          dragZone.addEventListener('pointermove', handleDragMove);
          dragZone.addEventListener('pointerup', handleDragEnd);
          dragZone.addEventListener('pointercancel', () => stopDrag(false));
        }

        updateHeaderState();

        api = {
          modal,
          openModal,
          closeModal,
          forceClose,
        };

        return api;
      };

      createModalController({
        modalId: 'experienceModal',
        triggerSelector: '[data-modal-trigger=\"experience\"]',
      });

      const scrollButtons = document.querySelectorAll('.js-scroll-btn');
      scrollButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const firstCard = document.querySelector('.gallery-list .card');
          if (firstCard) {
            firstCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });

      createModalController({
        modalId: 'caseStudyModal',
        triggerSelector: '[data-modal-trigger=\"case-study\"]',
        contentSelector: '[data-case-content]',
      });

      createModalController({
        modalId: 'auroxCaseModal',
        triggerSelector: '[data-modal-trigger=\"aurox-case\"]',
        contentSelector: '[data-case-content]',
      });
    })();

window.addEventListener('DOMContentLoaded', () => {
  if (window.feather) {
    window.feather.replace();
  }
});
