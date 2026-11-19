import { describe, expect, it } from "vitest";
import { cifraDeControl, cnpDeProba, esteCnpDeProba } from "./cnp-proba";

describe("CNP-urile de probă", () => {
  it("calculează cifra de control după algoritmul oficial", () => {
    // 1·2+9·7+6·9+0·1+4·4+0·6+7·3+9·5+9·8+0·2+1·7+2·9 = 298; 298 mod 11 = 1
    expect(cifraDeControl("196040799012")).toBe(1);
    const cnp = cnpDeProba("F", 1985, 3, 14, 7);
    expect(cnp).toHaveLength(13);
    expect(cnp.slice(0, 1)).toBe("2");
  });
  it("folosește mereu codul de județ 99, neatribuit", () => {
    const cnp = cnpDeProba("M", 2003, 12, 1, 123);
    expect(cnp.slice(7, 9)).toBe("99");
    expect(esteCnpDeProba(cnp)).toBe(true);
  });
  it("respinge un CNP cu alt cod de județ", () => {
    expect(esteCnpDeProba("1960407080011")).toBe(false);
  });
});
