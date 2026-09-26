import { useState } from "react";
import { api } from "../api";
import { useToast } from "../toast";
import { LoadingButton } from "./LoadingButton";
import { Modal } from "./Modal";

export function ProjectModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const save = async () => {
    const n = name.trim().toLowerCase();
    try {
      await api.createProject(n, description.trim());
      onClose();
      toast(`Created ${n}`);
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2>New project</h2>
      <div className="field">
        <label htmlFor="projNameInput">Name</label>
        <input type="text" id="projNameInput" placeholder="my-api" autoComplete="off" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="projDescInput">Description (optional)</label>
        <input type="text" id="projDescInput" placeholder="What this project is" autoComplete="off" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="error">{error}</div>
      <div className="modal-actions">
        <button className="ghost" onClick={onClose}>Cancel</button>
        <LoadingButton onClick={save}>Create</LoadingButton>
      </div>
    </Modal>
  );
}
