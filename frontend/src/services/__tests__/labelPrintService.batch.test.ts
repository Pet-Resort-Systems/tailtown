import { printKennelLabelsBatch, KennelLabelData } from "../labelPrintService";

describe("labelPrintService - printKennelLabelsBatch", () => {
  it("prints sequentially and reports failures", async () => {
    const labels: KennelLabelData[] = [
      {
        dogName: "A",
        customerLastName: "Smith",
        kennelNumber: "T1",
        groupSize: "Medium",
      },
      {
        dogName: "B",
        customerLastName: "Jones",
        kennelNumber: "T2",
        groupSize: "Medium",
      },
      {
        dogName: "C",
        customerLastName: "Brown",
        kennelNumber: "T3",
        groupSize: "Medium",
      },
    ];

    const callOrder: string[] = [];
    const printFn = jest
      .fn()
      .mockImplementation(async (data: KennelLabelData, _method: any) => {
        callOrder.push(data.dogName);
        if (data.dogName === "B") return false;
        if (data.dogName === "C") throw new Error("Printer error");
        return true;
      });

    const progress: Array<{ index: number; total: number; dogName: string }> =
      [];

    const result = await printKennelLabelsBatch(labels, "server", {
      delayMs: 0,
      printFn,
      onProgress: ({ index, total, label }) => {
        progress.push({ index, total, dogName: label.dogName });
      },
    });

    expect(printFn).toHaveBeenCalledTimes(3);
    expect(callOrder).toEqual(["A", "B", "C"]);
    expect(progress).toEqual([
      { index: 0, total: 3, dogName: "A" },
      { index: 1, total: 3, dogName: "B" },
      { index: 2, total: 3, dogName: "C" },
    ]);

    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(2);
    expect(result.failures).toHaveLength(2);
    expect(result.failures[0]).toMatchObject({
      index: 1,
      label: expect.objectContaining({ dogName: "B" }),
      error: "Print returned false",
    });
    expect(result.failures[1]).toMatchObject({
      index: 2,
      label: expect.objectContaining({ dogName: "C" }),
      error: "Printer error",
    });
  });
});
