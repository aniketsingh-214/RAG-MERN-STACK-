import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { 
  FileUp, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Upload,
  Clock,
  LayoutDashboard
} from 'lucide-react';
import { uploadAPI } from '../services/api';
import { Link } from 'react-router-dom';

export default function UploadPage() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    try {
      const res = await uploadAPI.getDocuments();
      setDocuments(res.data.documents);
    } catch (err) {
      toast.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const onDrop = useCallback((acceptedFiles) => {
    setFiles(acceptedFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file)
    })));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      await uploadAPI.upload(formData);
      toast.success('Document uploaded and processed!');
      setFiles([]);
      fetchDocuments();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await uploadAPI.deleteDocument(id);
      toast.success('Document deleted');
      setDocuments(docs => docs.filter(d => d._id !== id));
    } catch (err) {
      toast.error('Failed to delete document');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 p-6 lg:p-10 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Knowledge Base</h1>
            <p className="text-zinc-400">Upload and manage PDFs for the AI to learn from.</p>
          </div>
          <Link 
            to="/chat" 
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2.5 rounded-xl transition text-sm font-medium"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Go to Chat</span>
          </Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-brand-500" />
                Upload New PDF
              </h2>
              
              <div 
                {...getRootProps()} 
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                  ${isDragActive ? 'border-brand-500 bg-brand-500/5' : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/30'}
                `}
              >
                <input {...getInputProps()} />
                <FileUp className={`w-10 h-10 mx-auto mb-4 ${isDragActive ? 'text-brand-500' : 'text-zinc-600'}`} />
                <p className="text-sm font-medium text-zinc-300">
                  {isDragActive ? 'Drop your PDF here' : 'Click or drag PDF to upload'}
                </p>
                <p className="text-xs text-zinc-500 mt-2">Max size: 10MB</p>
              </div>

              {files.length > 0 && (
                <div className="mt-6 p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="w-5 h-5 text-brand-400 flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{files[0].name}</span>
                  </div>
                  <button 
                    onClick={() => setFiles([])}
                    className="p-1 hover:bg-zinc-700 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4 text-zinc-500" />
                  </button>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={files.length === 0 || uploading}
                className={`
                  w-full mt-6 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition
                  ${files.length === 0 || uploading 
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                    : 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/20'}
                `}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FileUp className="w-5 h-5" />
                    <span>Ingest Document</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-brand-900/10 border border-brand-900/20 rounded-2xl p-5">
              <h3 className="text-brand-400 text-sm font-semibold mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                How it works
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Once uploaded, our RAG pipeline will extract text, split it into chunks, and generate vector embeddings. Your AI will then be able to answer questions based on this document.
              </p>
            </div>
          </div>

          {/* List Section */}
          <div className="lg:col-span-2">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white">Your Documents</h2>
                <span className="text-xs font-mono bg-zinc-800 text-zinc-400 px-2 py-1 rounded-md">
                  {documents.length} Total
                </span>
              </div>

              {loading ? (
                <div className="p-20 text-center">
                  <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-4" />
                  <p className="text-zinc-500">Loading your knowledge base...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="p-20 text-center">
                  <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-zinc-600" />
                  </div>
                  <p className="text-zinc-400 font-medium">No documents yet</p>
                  <p className="text-zinc-600 text-sm mt-1">Upload a PDF to get started with RAG.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {documents.map((doc) => (
                    <div key={doc._id} className="p-5 flex items-center justify-between hover:bg-zinc-800/30 transition group">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-500/10 transition">
                          <FileText className="w-5 h-5 text-zinc-400 group-hover:text-brand-500 transition" />
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="text-sm font-semibold text-zinc-200 truncate">{doc.fileName}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                              <Clock className="w-3 h-3" />
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] bg-brand-500/10 text-brand-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                              Indexed
                            </span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDelete(doc._id)}
                        className="p-2.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
