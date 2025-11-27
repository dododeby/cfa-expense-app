"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileText, Download, Trash2, Eye, GripVertical } from "lucide-react"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
    listDocuments,
    uploadDocument,
    deleteDocument,
    reorderDocuments,
    getDocumentUrl,
    type LegislationDocument
} from "@/lib/legislation-utils"
import { PDFViewerModal } from "@/components/pdf-viewer-modal"

interface SortableDocumentProps {
    document: LegislationDocument
    isCFA: boolean
    onView: (doc: LegislationDocument) => void
    onDelete: (doc: LegislationDocument) => void
}

function SortableDocument({ document, isCFA, onView, onDelete }: SortableDocumentProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: document.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    const pdfUrl = getDocumentUrl(document.file_path)

    return (
        <div ref={setNodeRef} style={style}>
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                        {isCFA && (
                            <div
                                {...attributes}
                                {...listeners}
                                className="cursor-grab active:cursor-grabbing mt-1"
                            >
                                <GripVertical className="h-5 w-5 text-slate-400" />
                            </div>
                        )}
                        <div className="flex items-start gap-3 flex-1">
                            <FileText className="h-5 w-5 text-blue-600 mt-1" />
                            <div className="flex-1">
                                <CardTitle className="text-base">{document.file_name}</CardTitle>
                                {document.description && (
                                    <CardDescription className="mt-1">{document.description}</CardDescription>
                                )}
                                <p className="text-xs text-slate-500 mt-2">
                                    Enviado por {document.uploaded_by} em {new Date(document.uploaded_at).toLocaleDateString('pt-BR')}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onView(document)}
                                title="Visualizar PDF"
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const link = window.document.createElement('a')
                                    link.href = pdfUrl
                                    link.download = document.file_name
                                    link.click()
                                }}
                                title="Baixar PDF"
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                            {isCFA && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onDelete(document)}
                                    title="Excluir documento"
                                >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
            </Card>
        </div>
    )
}

export default function LegislacaoPage() {
    const [orgType, setOrgType] = useState<string>('')
    const [orgName, setOrgName] = useState<string>('')
    const [documents, setDocuments] = useState<LegislationDocument[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [fileDescription, setFileDescription] = useState('')
    const [viewingDocument, setViewingDocument] = useState<LegislationDocument | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    useEffect(() => {
        const type = sessionStorage.getItem('orgType') || ''
        const name = sessionStorage.getItem('orgName') || ''
        setOrgType(type)
        setOrgName(name)
        loadDocuments()
    }, [])

    const loadDocuments = async () => {
        setLoading(true)
        const docs = await listDocuments()
        setDocuments(docs)
        setLoading(false)

        // Update last viewed timestamp for legislation
        // Use orgId in key to isolate sessions on same browser
        const orgId = sessionStorage.getItem('orgId') || ''
        const storageKey = `lastViewedLegislation_${orgId}`
        localStorage.setItem(storageKey, new Date().toISOString())

        // Notify layout to update notification count immediately
        window.dispatchEvent(new Event('legislationRead'))
    }

    const isCFA = orgType === 'CFA'

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.type !== 'application/pdf') {
                alert('Apenas arquivos PDF são permitidos')
                return
            }
            if (file.size > 10 * 1024 * 1024) {
                alert('Arquivo muito grande. Máximo: 10MB')
                return
            }
            setSelectedFile(file)
        }
    }

    const handleUpload = async () => {
        if (!selectedFile) {
            alert('Selecione um arquivo PDF')
            return
        }

        setUploading(true)
        const result = await uploadDocument(selectedFile, fileDescription, orgName)

        if (result.success) {
            alert('Documento enviado com sucesso!')
            setSelectedFile(null)
            setFileDescription('')
            // Reset file input
            const fileInput = document.getElementById('file-upload') as HTMLInputElement
            if (fileInput) fileInput.value = ''
            loadDocuments()
        } else {
            alert(`Erro ao enviar documento: ${result.error}`)
        }

        setUploading(false)
    }

    const handleDelete = async (doc: LegislationDocument) => {
        if (!confirm(`Tem certeza que deseja excluir "${doc.file_name}"?`)) {
            return
        }

        if (!confirm('Esta ação não pode ser desfeita. Confirmar exclusão?')) {
            return
        }

        const result = await deleteDocument(doc.id)

        if (result.success) {
            alert('Documento excluído com sucesso!')
            loadDocuments()
        } else {
            alert(`Erro ao excluir documento: ${result.error}`)
        }
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = documents.findIndex((doc) => doc.id === active.id)
            const newIndex = documents.findIndex((doc) => doc.id === over.id)

            const newDocuments = arrayMove(documents, oldIndex, newIndex)
            setDocuments(newDocuments)

            // Update display_order in database
            const newOrder = newDocuments.map((doc, index) => ({
                id: doc.id,
                order: index
            }))

            await reorderDocuments(newOrder)
        }
    }

    if (loading) {
        return <div className="text-center py-12">Carregando documentos...</div>
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Legislação</h1>
                <p className="text-slate-500">Documentos normativos e legislação aplicável</p>
            </div>

            {/* Upload Section - CFA Only */}
            {isCFA && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            Adicionar Documento
                        </CardTitle>
                        <CardDescription>Apenas o CFA pode adicionar documentos de legislação</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="file-upload">Arquivo PDF</Label>
                            <Input
                                id="file-upload"
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={handleFileSelect}
                                disabled={uploading}
                            />
                            {selectedFile && (
                                <p className="text-sm text-slate-600">
                                    Arquivo selecionado: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fileDescription">Descrição (opcional)</Label>
                            <Textarea
                                id="fileDescription"
                                value={fileDescription}
                                onChange={(e) => setFileDescription(e.target.value)}
                                placeholder="Breve descrição do documento"
                                rows={3}
                                disabled={uploading}
                            />
                        </div>
                        <Button
                            onClick={handleUpload}
                            className="w-full"
                            disabled={!selectedFile || uploading}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploading ? 'Enviando...' : 'Adicionar Documento'}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Documents List */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Documentos Disponíveis</h2>
                    {isCFA && documents.length > 0 && (
                        <p className="text-sm text-slate-500">
                            Arraste e solte para reordenar
                        </p>
                    )}
                </div>

                {documents.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-slate-500">
                            Nenhum documento disponível ainda.
                        </CardContent>
                    </Card>
                ) : isCFA ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={documents.map(d => d.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-3">
                                {documents.map((doc) => (
                                    <SortableDocument
                                        key={doc.id}
                                        document={doc}
                                        isCFA={isCFA}
                                        onView={setViewingDocument}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                ) : (
                    <div className="space-y-3">
                        {documents.map((doc) => (
                            <SortableDocument
                                key={doc.id}
                                document={doc}
                                isCFA={isCFA}
                                onView={setViewingDocument}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* PDF Viewer Modal */}
            {viewingDocument && (
                <PDFViewerModal
                    isOpen={!!viewingDocument}
                    onClose={() => setViewingDocument(null)}
                    pdfUrl={getDocumentUrl(viewingDocument.file_path)}
                    fileName={viewingDocument.file_name}
                />
            )}
        </div>
    )
}
