CREATE TABLE role (
    id_role SMALLINT UNSIGNED NOT NULL,
    nom VARCHAR(100) NOT NULL,
    permissions INT UNSIGNED NOT NULL, -- BITMASK
    CONSTRAINT pk_role PRIMARY KEY (id_role)
);

CREATE TABLE utilisateur (
    id_utilisateur SMALLINT UNSIGNED NOT NULL,
    mot_de_passe BLOB NOT NULL,
    email VARCHAR(320) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    id_role SMALLINT UNSIGNED NOT NULL,
    CONSTRAINT pk_utilisateur PRIMARY KEY (id_utilisateur),
    CONSTRAINT fk_utilisateur_role FOREIGN KEY (id_role) 
        REFERENCES role(id_role)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE session_examen (
    id_session INT UNSIGNED NOT NULL,
    nom VARCHAR(100) NOT NULL,
    annee SMALLINT UNSIGNED NOT NULL,
    statut TINYINT UNSIGNED NOT NULL, -- 0 : ACTIVE, 1 : TERMINEE, 2 : ARCHIVEE
    CONSTRAINT pk_session_examen PRIMARY KEY (id_session)
);

CREATE TABLE etudiant (
    numero_etudiant INT UNSIGNED NOT NULL,
    id_session INT UNSIGNED NOT NULL,
    CONSTRAINT pk_etudiant PRIMARY KEY (numero_etudiant, id_session),
    CONSTRAINT fk_etudiant_session FOREIGN KEY (id_session)
        REFERENCES session_examen(id_session)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE epreuve (
    id_session INT UNSIGNED NOT NULL,
    code_epreuve CHAR(7) NOT NULL, -- HAXXXXX
    nom VARCHAR(100) NOT NULL,
    statut TINYINT UNSIGNED NOT NULL, -- 0 : INITIAL, 1 : MATERIEL EXAMEN IMPRIME, 2 : DEPOT COPIES, 3 : DEPOT COMPLET, 4 : NOTES EXPORTEES
    date_epreuve DATETIME NOT NULL,
    duree SMALLINT UNSIGNED NOT NULL,
    inscrits SMALLINT UNSIGNED NOT NULL,
    CONSTRAINT pk_epreuve_session PRIMARY KEY (id_session, code_epreuve),
    CONSTRAINT fk_es_session FOREIGN KEY (id_session)
        REFERENCES session_examen(id_session)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE epreuve_session_etudiant (
    id_session INT UNSIGNED NOT NULL,
    code_epreuve CHAR(7) NOT NULL,
    numero_etudiant INT UNSIGNED NOT NULL,
    code_anonymat CHAR(4) NOT NULL,
    note_quart TINYINT UNSIGNED,
    lieu VARCHAR(100) NOT NULL,
    CONSTRAINT pk_epreuve_session_etudiant PRIMARY KEY (id_session, code_epreuve, numero_etudiant),
    CONSTRAINT uq_code UNIQUE (id_session, code_anonymat),
    CONSTRAINT fk_ese_session FOREIGN KEY (id_session)
        REFERENCES session_examen(id_session)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ese_epreuve FOREIGN KEY (id_session, code_epreuve)
        REFERENCES epreuve(id_session, code_epreuve)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ese_etudiant FOREIGN KEY (numero_etudiant, id_session)
        REFERENCES etudiant(numero_etudiant, id_session)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE incident (
    id_incident INT UNSIGNED NOT NULL,
    id_session INT UNSIGNED NOT NULL,
    titre VARCHAR(100) NOT NULL,
    details VARCHAR(250) NOT NULL,
    resolu BIT NOT NULL,
    code_anonymat CHAR(4),
    note_quart TINYINT UNSIGNED,
    id_utilisateur SMALLINT UNSIGNED NOT NULL,
    CONSTRAINT pk_incident PRIMARY KEY (id_incident),
    CONSTRAINT fk_incident_session FOREIGN KEY (id_session)
        REFERENCES session_examen(id_session)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_incident_utilisateur FOREIGN KEY (id_utilisateur)
        REFERENCES utilisateur(id_utilisateur)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE incident_historique (
    id_historique INT UNSIGNED NOT NULL,
    id_incident INT UNSIGNED NOT NULL,
    date_correction DATETIME NOT NULL,
    code_anonymat CHAR(4),
    note_quart TINYINT UNSIGNED,
    CONSTRAINT pk_incident_historique PRIMARY KEY (id_historique),
    CONSTRAINT fk_historique_incident FOREIGN KEY (id_incident)
        REFERENCES incident(id_incident)
        ON DELETE CASCADE ON UPDATE CASCADE
);
