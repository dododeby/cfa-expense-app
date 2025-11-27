"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"

interface PDFViewerModalProps {
    isOpen: boolean
    onClose: () => void
    pdfUrl: string
    fileName: string
}

export function PDFViewerModal({ isOpen, onClose, pdfUrl, fileName }: PDFViewerModalProps) {
    const handleDownload = () => {
        const link = document.createElement('a')
        link.href = pdfUrl
        link.download = fileName
        link.click()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[90vh] p-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg">{fileName}</DialogTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Baixar
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>
                <div className="flex-1 overflow-hidden">
                    <iframe
                        src={pdfUrl}
                        className="w-full h-full"
                        title={`Visualizador de PDF: ${fileName}`}
                        style={{ border: 'none', height: 'calc(90vh - 80px)' }}
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}
