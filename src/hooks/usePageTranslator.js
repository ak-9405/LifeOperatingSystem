import { useEffect, useRef } from 'react';

export default function usePageTranslator(setNotice, setIsTranslating) {
  const recordsRef = useRef([]);
  const nodeRecordsRef = useRef(new WeakMap());
  const attributeRecordsRef = useRef(new WeakMap());
  const translatedRef = useRef(new Map());
  const activeLanguageRef = useRef('en');
  const inFlightRef = useRef(false);
  const translatableAttributes = ['placeholder', 'aria-label', 'aria-description', 'title', 'alt'];

  const cacheFor = (language) => {
    if (!translatedRef.current.has(language)) translatedRef.current.set(language, new Map());
    return translatedRef.current.get(language);
  };

  const scanPage = () => {
    const root = document.getElementById('root');
    if (!root) return [];
    const dirty = [];
    const isIgnored = (element) => Boolean(element.closest('[data-translate-ignore],script,style'));
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const text = node.nodeValue || '';
        if (!text.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || isIgnored(parent) || parent.closest('textarea,input,svg')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let node = walker.nextNode();
    while (node) {
      let record = nodeRecordsRef.current.get(node);
      if (!record) {
        record = { kind: 'text', node, source: node.nodeValue, lastApplied: node.nodeValue };
        nodeRecordsRef.current.set(node, record);
        recordsRef.current.push(record);
        dirty.push(record);
      } else if (node.nodeValue !== record.lastApplied) {
        // React may restore English content after a translated render. Treat that as dirty too.
        if (node.nodeValue !== record.source) record.source = node.nodeValue;
        record.lastApplied = node.nodeValue;
        dirty.push(record);
      }
      node = walker.nextNode();
    }

    root.querySelectorAll('*').forEach((element) => {
      if (isIgnored(element)) return;
      let elementRecords = attributeRecordsRef.current.get(element);
      for (const attribute of translatableAttributes) {
        if (!element.hasAttribute(attribute)) {
          if (elementRecords?.has(attribute)) elementRecords.get(attribute).active = false;
          continue;
        }
        const value = element.getAttribute(attribute) || '';
        if (!value.trim()) {
          if (elementRecords?.has(attribute)) elementRecords.get(attribute).active = false;
          continue;
        }

        if (!elementRecords) {
          elementRecords = new Map();
          attributeRecordsRef.current.set(element, elementRecords);
        }

        let record = elementRecords.get(attribute);
        if (!record) {
          record = { kind: 'attribute', node: element, attribute, source: value, lastApplied: value, active: true };
          elementRecords.set(attribute, record);
          recordsRef.current.push(record);
          dirty.push(record);
        } else {
          record.active = true;
          if (value !== record.lastApplied) {
            if (value !== record.source) record.source = value;
            record.lastApplied = value;
            dirty.push(record);
          }
        }
      }
    });

    recordsRef.current = recordsRef.current.filter((record) => record.node.isConnected);
    return dirty;
  };

  const applyLanguage = async (language, changedOnly = false, discoveredRecords = null) => {
    const discovered = discoveredRecords ?? scanPage();
    if (language === 'en') {
      for (const record of recordsRef.current) {
        if (!record.node.isConnected || record.active === false) continue;
        record.lastApplied = record.source;
        if (record.kind === 'attribute') record.node.setAttribute(record.attribute, record.source);
        else record.node.nodeValue = record.source;
      }
      activeLanguageRef.current = 'en';
      return true;
    }

    const cache = cacheFor(language);
    const records = (changedOnly ? discovered : recordsRef.current.filter((record) => record.node.isConnected))
      .filter((record) => record.active !== false);
    const uniqueSources = [...new Set(records.map((record) => record.source.trim()).filter(Boolean))];
    const missing = uniqueSources.filter((text) => !cache.has(text));

    for (let start = 0; start < missing.length; start += 100) {
      const batch = missing.slice(start, start + 100);
      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: batch, target: language }),
        });
        const result = await response.json();
        if (!response.ok) {
          setNotice(result.error || 'The local translation service could not translate that text. Please try again.');
          return false;
        }
        batch.forEach((text, index) => cache.set(text, decodeTranslatedText(result.translations[index] || text)));
      } catch {
        setNotice('The local translation service is starting or unavailable. Please try again in a moment.');
        return false;
      }
    }

    for (const record of records) {
      if (!record.node.isConnected || record.active === false) continue;
      const translated = cache.get(record.source.trim()) || record.source;
      const spacing = record.source.match(/^(\s*)([\s\S]*?)(\s*)$/);
      const value = spacing ? spacing[1] + translated + spacing[3] : translated;
      record.lastApplied = value;
      if (record.kind === 'attribute') record.node.setAttribute(record.attribute, value);
      else record.node.nodeValue = value;
    }
    activeLanguageRef.current = language;
    return true;
  };

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;
    let timer;

    const scheduleScan = () => {
      if (activeLanguageRef.current === 'en') return;
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        if (inFlightRef.current) {
          scheduleScan();
          return;
        }
        const dirty = scanPage();
        if (!dirty.length) return;
        inFlightRef.current = true;
        try {
          await applyLanguage(activeLanguageRef.current, true, dirty);
        } finally {
          inFlightRef.current = false;
        }
      }, 80);
    };
    const observer = new MutationObserver(scheduleScan);

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: translatableAttributes,
    });
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  return {
    translate: async (language) => {
      if (language === 'en') return applyLanguage('en');
      if (inFlightRef.current) return false;
      inFlightRef.current = true;
      setIsTranslating(true);
      try {
        const complete = await applyLanguage(language);
        if (complete) setNotice('');
        return complete;
      } finally {
        inFlightRef.current = false;
        setIsTranslating(false);
      }
    },
  };
}
function decodeTranslatedText(value) {
  const decoder = document.createElement('textarea');
  decoder.innerHTML = value;
  return decoder.value;
}
