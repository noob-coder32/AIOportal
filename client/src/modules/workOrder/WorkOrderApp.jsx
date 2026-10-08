import { useState } from "react";
import api from "../../api";
import { showToast } from "../../utils/toast";
import "./workOrder.css";

const initialForm = {
    poHdrId: "",
    poNo: "",
};

function WorkOrderApp() {
    const [form, setForm] = useState(initialForm);
    const [loadingAction, setLoadingAction] = useState("");
    const [lastSuccess, setLastSuccess] = useState(null);

    const hasPoHdrId = form.poHdrId.trim().length > 0;
    const hasPoNo = form.poNo.trim().length > 0;

    function buildRequest() {
        if (hasPoHdrId) {
            return {
                url: `/work-orders/${encodeURIComponent(form.poHdrId.trim())}/pdf`,
                descriptor: `PO Header ID ${form.poHdrId.trim()}`,
            };
        }

        if (hasPoNo) { 
            return {
                url: `/work-orders/by-po-no/${encodeURIComponent(form.poNo.trim())}/pdf`,
                descriptor: `PO Number ${form.poNo.trim()}`,
            };
        }

        return null;
    }

    function extractFileName(contentDisposition, fallback) {
        const match = /filename="([^"]+)"/i.exec(contentDisposition || "");
        return match?.[1] || fallback;
    }

    async function handleGenerate(mode) {
        const request = buildRequest();

        if (!request) {
            showToast("Enter either PO Header ID or PO Number", "warning");
            return;
        }

        setLoadingAction(mode);

        try {
            const response = await api.get(request.url, {
                responseType: "blob",
            });

            const fileName = extractFileName(
                response.headers["content-disposition"],
                "po-wo.pdf"
            );

            const blobUrl = window.URL.createObjectURL(
                new Blob([response.data], { type: "application/pdf" })
            );

            if (mode === "preview") {
                window.open(blobUrl, "_blank", "noopener,noreferrer");
            } else {
                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                link.remove();
            }

            setTimeout(() => {
                window.URL.revokeObjectURL(blobUrl);
            }, 60_000);

            setLastSuccess({
                descriptor: request.descriptor,
                fileName,
                mode,
                generatedAt: new Date().toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                }),
            });

            showToast(
                mode === "preview"
                    ? "PO/WO PDF opened in a new tab"
                    : "PO/WO PDF downloaded successfully",
                "success"
            );
        } catch (error) {
            const message = error.response?.status === 404
                ? "PO/WO document not found"
                : error.response?.data?.message || "Failed to generate PO/WO PDF";

            showToast(message, "error");
            console.error("Failed to generate PO/WO PDF", error);
        } finally {
            setLoadingAction("");
        }
    }

    async function handleGenerateAll(mode) {
        setLoadingAction(mode);

        try {
            const response = await api.get("/work-orders/all/pdf", {
                responseType: "blob",
            });

            const fileName = extractFileName(
                response.headers["content-disposition"],
                "all-work-orders.pdf"
            );

            const blobUrl = window.URL.createObjectURL(
                new Blob([response.data], { type: "application/pdf" })
            );

            if (mode === "preview-all") {
                window.open(blobUrl, "_blank", "noopener,noreferrer");
            } else {
                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                link.remove();
            }

            setTimeout(() => {
                window.URL.revokeObjectURL(blobUrl);
            }, 60_000);

            setLastSuccess({
                descriptor: "All PO/WO Documents",
                fileName,
                mode,
                generatedAt: new Date().toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                }),
            });

            showToast(
                mode === "preview-all"
                    ? "Merged PO/WO PDF opened in a new tab"
                    : "Merged PO/WO PDF downloaded successfully",
                "success"
            );
        } catch (error) {
            const message = error.response?.status === 404
                ? "No order documents found"
                : error.response?.data?.message || "Failed to generate merged PO/WO PDF";

            showToast(message, "error");
            console.error("Failed to generate merged PO/WO PDF", error);
        } finally {
            setLoadingAction("");
        }
    }

    function handleReset() {
        setForm(initialForm);
        setLastSuccess(null);
    }

    return (
        <div className="work-order-page">
            <div className="work-order-hero">
                <div>
                    <h2>PO/WO PDF</h2>
                    <p>
                        Generate PO/WO PDF using either a PO Header ID
                        or a PO Number from the ERP tables.
                    </p>
                </div>
                <div className="work-order-badge">A4 PDF</div>
            </div>

            <div className="work-order-panel">
                <div className="work-order-grid">
                    <div>
                        <label>PO Header ID</label>
                        <input
                            placeholder="Example: 86041"
                            value={form.poHdrId}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    poHdrId: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div>
                        <label>PO Number</label>
                        <input
                            placeholder="Example: PDPSL/PDP/GWH/SB/2026-2027/000049"
                            value={form.poNo}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    poNo: event.target.value,
                                }))
                            }
                        />
                    </div>
                </div>

                <div className="work-order-hint">
                    If both are filled, the module will use <strong>PO Header ID</strong> first.
                </div>

                <div className="work-order-actions">
                    <button
                        className="work-order-primary"
                        onClick={() => handleGenerate("preview")}
                        disabled={loadingAction !== ""}
                    >
                        {loadingAction === "preview" ? "Opening..." : "Preview PDF"}
                    </button>

                    <button
                        className="work-order-secondary"
                        onClick={() => handleGenerate("download")}
                        disabled={loadingAction !== ""}
                    >
                        {loadingAction === "download" ? "Downloading..." : "Download PDF"}
                    </button>

                    <button
                        className="work-order-primary"
                        onClick={() => handleGenerateAll("preview-all")}
                        disabled={loadingAction !== ""}
                    >
                        {loadingAction === "preview-all" ? "Opening All..." : "Preview All"}
                    </button>

                    <button
                        className="work-order-secondary"
                        onClick={() => handleGenerateAll("download-all")}
                        disabled={loadingAction !== ""}
                    >
                        {loadingAction === "download-all" ? "Downloading All..." : "Download All"}
                    </button>

                    <button
                        className="work-order-ghost"
                        onClick={handleReset}
                        disabled={loadingAction !== ""}
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* <div className="work-order-panel work-order-note-panel">
                <h3>Quick Test</h3>
                <p>Use <strong>PO Header ID `86041`</strong> for the first smoke test.</p>
                <p>
                    That record was already validated against the backend PDF endpoint and is a
                    good known-working sample.
                </p>
            </div> */}

            {lastSuccess ? (
                <div className="work-order-panel work-order-result-panel">
                    <h3>Last Generated File</h3>
                    <div className="work-order-result-grid">
                        <div>
                            <span>Source</span>
                            <strong>{lastSuccess.descriptor}</strong>
                        </div>
                        <div>
                            <span>File</span>
                            <strong>{lastSuccess.fileName}</strong>
                        </div>
                        <div>
                            <span>Action</span>
                            <strong>{lastSuccess.mode === "preview" ? "Previewed" : "Downloaded"}</strong>
                        </div>
                        <div>
                            <span>Time</span>
                            <strong>{lastSuccess.generatedAt}</strong>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default WorkOrderApp;
