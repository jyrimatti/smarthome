let initTooltips = doc => {
  let elems = doc.body.querySelectorAll('[title]')

  elems.forEach(x => {
    x.setAttribute('title', x.getAttribute('title')
                             .replaceAll('{{today}}', new Date().toISOString().slice(0, 10)));
  });

  tippy(elems, {
    allowHTML:   true,
    interactive: true,
    theme:       'light',
    content(reference) {
        let title = reference.getAttribute('title');
        reference.removeAttribute('title');
        return title;
    }
  });
};

let getSelectedBaseInterval = doc =>
  [...doc.querySelectorAll('#template option')].find(x => x.getAttribute('value') == x.parentElement.value)
                                                           .getAttribute('data-baseInterval');

let readInterval = dateFns => {
  if (window.location.hash) {
    let ret = window.location.hash.split("#").find(x => {
      let times = x.substring(1).split('/').map(x => new Date(x));
      if (times.length == 2 && !isNaN(times[0]) && !isNaN(times[1])) {
        return {start: times[0], end: times[1]};
      }
    });
    if (ret) {
      return ret;
    }
  }
  return {start: dateFns.addMonths(new Date(), -1), end: dateFns.addDays(new Date(), 2)};
};

let initQuery = (dateFns, elem) => {
  let interval = readInterval(dateFns);
  elem.value = elem.value.replace("{start}", interval.start.toISOString())
                         .replace("{end}",   interval.end.toISOString());
};
