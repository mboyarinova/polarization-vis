// example of how to export functions
// this particular util only doubles a value so it shouldn't be too useful
export function getDomain(data, accesor) {
  return data.reduce((acc, row) => {
    return {
      min: Math.min(acc.min, row[accesor]),
      max: Math.max(acc.max, row[accesor])
    };
  }, {min: Infinity, max: -Infinity});
}
